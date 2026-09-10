import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function parse(relative) {
    const url = new URL(relative, import.meta.url);
    return ts.createSourceFile(url.pathname, readFileSync(url, "utf8"), ts.ScriptTarget.Latest, true);
}

const sourceTypes = parse("../../src/types/language-learning/history.ts");
const learningSource = sourceTypes.statements.find((node) =>
    ts.isTypeAliasDeclaration(node) && node.name.text === "LearningSource",
);
assert.ok(learningSource && ts.isUnionTypeNode(learningSource.type));
const sources = learningSource.type.types.map((node) => {
    assert.ok(ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal));
    return node.literal.text;
});

const widget = parse("../../src/components/language-learning/dashboard/widgets/DashboardWeaknessInsightsWidget.tsx");
let labels;
function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "sourceLabels") {
        assert.ok(node.initializer && ts.isObjectLiteralExpression(node.initializer));
        labels = new Map(node.initializer.properties.map((property) => {
            assert.ok(ts.isPropertyAssignment(property) && ts.isCallExpression(property.initializer));
            const key = property.initializer.arguments[0];
            assert.ok(key && ts.isStringLiteral(key));
            return [property.name.getText(widget), key.text];
        }));
    }
    ts.forEachChild(node, visit);
}
visit(widget);

test("dashboard weakness source labels cover every LearningSource including Vocabulary", () => {
    assert.ok(labels);
    assert.deepEqual([...labels.keys()].sort(), [...sources].sort());
});

for (const locale of ["ko", "ja", "learning"]) {
    test(`dashboard weakness source labels resolve in ${locale}`, () => {
        const messages = JSON.parse(readFileSync(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8"));
        const namespace = messages.LanguageLearning.dashboard;
        for (const key of labels.values()) {
            const value = key.split(".").reduce((item, part) => item?.[part], namespace);
            assert.equal(typeof value, "string", `Missing ${locale}: LanguageLearning.dashboard.${key}`);
            assert.ok(value.trim());
        }
    });
}
