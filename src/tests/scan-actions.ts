import { Project, SyntaxKind, Node, FunctionDeclaration, ArrowFunction, VariableDeclaration } from "ts-morph";
import { askLLM } from "../lib/llm-client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const tenantTables = ["purchases", "invoices", "tenants", "monthlyPeriods", "gstFilingPackages", "auditorClients"];
const dbMethods = ["select", "insert", "update", "delete"];

async function runScan() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });

  const scanTarget = process.argv[2];
  const sourceFiles = scanTarget ? 
    project.getSourceFiles(scanTarget) :
    [
      ...project.getSourceFiles("src/app/actions/**/*.ts"),
      ...project.getSourceFiles("src/app/auditor/**/actions.ts"),
      ...project.getSourceFiles("src/app/api/whatsapp/webhook/route.ts")
    ];

  const violations: { file: string; func: string; code: string }[] = [];

  for (const sourceFile of sourceFiles) {
    const exportedFunctions = [
      ...sourceFile.getFunctions().filter(f => f.isExported()),
      ...sourceFile.getVariableDeclarations().filter(v => v.isExported() && v.getInitializerIfKind(SyntaxKind.ArrowFunction))
    ];

    for (const func of exportedFunctions) {
      const funcName = Node.isFunctionDeclaration(func) ? func.getName() : (func as VariableDeclaration).getName();
      if (!funcName) continue;

      const body = Node.isFunctionDeclaration(func) ? func.getBody() : (func as VariableDeclaration).getInitializerIfKind(SyntaxKind.ArrowFunction)?.getBody();
      if (!body) continue;

      let usesDb = false;
      let touchesTenantTable = false;
      let callsAssertTenantAccess = false;
      let hasSkipComment = body.getText().includes("@skip-tenant-check");

      // Check for db.select/insert/update/delete
      body.forEachDescendant(node => {
        if (Node.isPropertyAccessExpression(node)) {
          const exp = node.getExpression();
          const name = node.getName();
          if (exp.getText() === "db" && dbMethods.includes(name)) {
            usesDb = true;
          }
        }
        if (Node.isIdentifier(node)) {
          if (tenantTables.includes(node.getText())) {
            touchesTenantTable = true;
          }
          if (node.getText() === "assertTenantAccess") {
            callsAssertTenantAccess = true;
          }
        }
      });

      if (usesDb && touchesTenantTable && !callsAssertTenantAccess && !hasSkipComment) {
        violations.push({
          file: sourceFile.getFilePath(),
          func: funcName,
          code: body.getText()
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`Found ${violations.length} violations of RLS Bypass safety net:\n`);
    for (const v of violations) {
      console.error(`- File: ${v.file}`);
      console.error(`  Function: ${v.func}`);
      console.error(`  Error: Found tenant-scoped database query without assertTenantAccess.\n`);
      
      console.log(`[LLM Analysis] Requesting explanation for ${v.func}...`);
      try {
        const explanation = await askLLM({
          messages: [{
            role: "user",
            content: `This function touches tenant-scoped data. Does it appear to correctly verify tenant/role authorization before the database call? Explain your reasoning.\n\nCode:\n${v.code}`
          }]
        });
        console.log(`LLM Output:\n${explanation}\n`);
      } catch (err) {
        console.error("LLM Analysis failed:", err);
      }
    }
    process.exit(1);
  } else {
    console.log("AST Scan complete: No RLS Bypass violations found.");
    process.exit(0);
  }
}

runScan().catch(e => {
  console.error(e);
  process.exit(1);
});
