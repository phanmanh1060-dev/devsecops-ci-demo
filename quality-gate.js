/**
 * QUALITY GATE
 * Doc ket qua tu SAST (semgrep-report.json) va SCA (sca-report.json),
 * tong hop, phan loai theo muc do nghiem trong, va quyet dinh pass/fail pipeline.
 *
 * Nguong mac dinh: fail build neu co >=1 loi CRITICAL/HIGH (SCA) hoac ERROR (SAST).
 * Co the chinh nguong qua bien moi truong MAX_HIGH, MAX_CRITICAL.
 */
const fs = require("fs");

const MAX_CRITICAL = parseInt(process.env.MAX_CRITICAL || "0", 10);
const MAX_HIGH = parseInt(process.env.MAX_HIGH || "0", 10);

function readJson(path) {
  if (!fs.existsSync(path)) return null;
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function summarizeSast(report) {
  const summary = { ERROR: 0, WARNING: 0, INFO: 0, findings: [] };
  if (!report) return summary;
  for (const r of report.results || []) {
    const sev = r.extra?.severity || "INFO";
    summary[sev] = (summary[sev] || 0) + 1;
    summary.findings.push({
      tool: "SAST (Semgrep)",
      rule: r.check_id,
      severity: sev,
      file: r.path,
      line: r.start?.line,
      owasp: r.extra?.metadata?.owasp || "",
    });
  }
  return summary;
}

function summarizeSca(report) {
  const summary = { critical: 0, high: 0, moderate: 0, low: 0, findings: [] };
  if (!report) return summary;
  const meta = report.metadata?.vulnerabilities || {};
  summary.critical = meta.critical || 0;
  summary.high = meta.high || 0;
  summary.moderate = meta.moderate || 0;
  summary.low = meta.low || 0;
  for (const [name, info] of Object.entries(report.vulnerabilities || {})) {
    summary.findings.push({
      tool: "SCA (npm audit)",
      package: name,
      severity: info.severity,
    });
  }
  return summary;
}

function main() {
  const sast = summarizeSast(readJson("semgrep-report.json"));
  const sca = summarizeSca(readJson("sca-report.json"));

  const report = {
    generated_at: new Date().toISOString(),
    sast_summary: { ERROR: sast.ERROR, WARNING: sast.WARNING, INFO: sast.INFO },
    sca_summary: { critical: sca.critical, high: sca.high, moderate: sca.moderate, low: sca.low },
    findings: [...sast.findings, ...sca.findings],
  };

  fs.writeFileSync("security-report.json", JSON.stringify(report, null, 2));

  console.log("========== BAO CAO TONG HOP AN TOAN THONG TIN ==========");
  console.log(`SAST  -> ERROR: ${sast.ERROR}, WARNING: ${sast.WARNING}`);
  console.log(`SCA   -> CRITICAL: ${sca.critical}, HIGH: ${sca.high}, MODERATE: ${sca.moderate}, LOW: ${sca.low}`);
  console.log("==========================================================");

  const failReasons = [];
  if (sast.ERROR > MAX_CRITICAL) {
    failReasons.push(`SAST phat hien ${sast.ERROR} loi muc ERROR (nguong cho phep: ${MAX_CRITICAL})`);
  }
  if (sca.critical > MAX_CRITICAL) {
    failReasons.push(`SCA phat hien ${sca.critical} lo hong muc CRITICAL (nguong cho phep: ${MAX_CRITICAL})`);
  }
  if (sca.high > MAX_HIGH) {
    failReasons.push(`SCA phat hien ${sca.high} lo hong muc HIGH (nguong cho phep: ${MAX_HIGH})`);
  }

  if (failReasons.length > 0) {
    console.log("\n❌ QUALITY GATE: FAILED. Pipeline se bi chan (khong duoc merge/deploy).");
    failReasons.forEach((r) => console.log("   - " + r));
    process.exit(1);
  } else {
    console.log("\n✅ QUALITY GATE: PASSED.");
    process.exit(0);
  }
}

main();
