import { jsPDF } from 'jspdf';
import { TaskWorkflow } from '../types/workflow';

export function formatFinalResultAsText(task: TaskWorkflow): string {
  const result = task.finalResult;
  if (!result) {
    return `${task.title}\n\nOriginal Request:\n${task.userRequest}\n\nStatus: ${task.status}`;
  }

  const lines: string[] = [];
  lines.push('====================================================================');
  lines.push(`AGENTFLOW AI — FINAL COLLABORATIVE DELIVERABLE`);
  lines.push('====================================================================');
  lines.push(`Task Title: ${result.title || task.title}`);
  lines.push(`Category: ${task.category} | Output Format: ${task.outputFormat}`);
  lines.push(`Final Quality Score: ${result.finalQualityScore}/100 (Threshold: ${task.qualityThreshold}/100)`);
  lines.push(`Review Iterations: ${task.reviewHistory.length} / ${task.maxReviewCycles}`);
  lines.push(`Completion Status: ${result.completionStatus}`);
  lines.push(`Generated At: ${new Date(task.completedAt || task.updatedAt).toLocaleString()}`);
  lines.push('');
  lines.push('EXECUTIVE SUMMARY');
  lines.push('--------------------------------------------------------------------');
  lines.push(result.executiveSummary);
  lines.push('');

  for (const section of result.finalAnswerSections) {
    lines.push(section.heading.toUpperCase());
    lines.push('--------------------------------------------------------------------');
    lines.push(section.content);
    lines.push('');
  }

  if (result.recommendations.length > 0) {
    lines.push('IMPORTANT RECOMMENDATIONS');
    lines.push('--------------------------------------------------------------------');
    result.recommendations.forEach((rec, idx) => {
      lines.push(`${idx + 1}. ${rec}`);
    });
    lines.push('');
  }

  if (result.limitations.length > 0) {
    lines.push('LIMITATIONS & ASSUMPTIONS');
    lines.push('--------------------------------------------------------------------');
    result.limitations.forEach((lim, idx) => {
      lines.push(`${idx + 1}. ${lim}`);
    });
    lines.push('');
  }

  if (result.agentContributions.length > 0) {
    lines.push('AGENT CONTRIBUTION SUMMARY');
    lines.push('--------------------------------------------------------------------');
    result.agentContributions.forEach((c) => {
      lines.push(`- ${c.agentName} (${c.role}): ${c.contributionSummary}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadTextFile(task: TaskWorkflow): void {
  const content = formatFinalResultAsText(task);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
  anchor.href = url;
  anchor.download = `${slug || 'agentflow-result'}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadPdfFile(task: TaskWorkflow): void {
  const result = task.finalResult;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 56;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addHeading = (text: string, size = 13) => {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(30, 41, 59);
    const wrapped = doc.splitTextToSize(text, maxWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * (size * 1.35) + 4;
  };

  const addBody = (text: string, size = 10.5) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(51, 65, 85);
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        y += 6;
        continue;
      }
      const wrapped = doc.splitTextToSize(trimmed, maxWidth);
      for (const line of wrapped) {
        ensureSpace(16);
        doc.text(line, margin, y);
        y += 15;
      }
      y += 4;
    }
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229);
  doc.text('AGENTFLOW AI  |  MULTI-AGENT COLLABORATIVE REPORT', margin, y);
  y += 20;

  addHeading(result?.title || task.title, 18);
  y += 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  const metaLine = `Category: ${task.category}  |  Format: ${task.outputFormat}  |  Quality Score: ${
    result?.finalQualityScore ?? 'N/A'
  }/100  |  Review Cycles: ${task.reviewHistory.length}`;
  doc.text(metaLine, margin, y);
  y += 14;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  if (!result) {
    addHeading('Task Request');
    addBody(task.userRequest);
  } else {
    addHeading('Executive Summary');
    addBody(result.executiveSummary);
    y += 6;

    for (const section of result.finalAnswerSections) {
      addHeading(section.heading);
      addBody(section.content);
      y += 6;
    }

    if (result.recommendations.length > 0) {
      addHeading('Important Recommendations');
      result.recommendations.forEach((rec, i) => addBody(`${i + 1}. ${rec}`));
      y += 6;
    }

    if (result.limitations.length > 0) {
      addHeading('Limitations & Assumptions');
      result.limitations.forEach((lim, i) => addBody(`${i + 1}. ${lim}`));
      y += 6;
    }

    if (result.agentContributions.length > 0) {
      addHeading('Agent Contribution Summary');
      result.agentContributions.forEach((c) =>
        addBody(`${c.agentName} (${c.role}): ${c.contributionSummary}`)
      );
    }
  }

  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
  doc.save(`${slug || 'agentflow-report'}.pdf`);
}
