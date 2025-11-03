import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { LessonPlanResponse } from '../types';

// ===================================================================================
// PDF EXPORT
// ===================================================================================

const addSection = (doc: jsPDF, title: string, y: number, margin: number, checkPageBreak: (height: number) => number) => {
    y = checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, margin, y);
    doc.setDrawColor(22, 163, 74); // emerald-500
    doc.line(margin, y + 2, margin + 50, y + 2);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    return y;
};

const addText = (doc: jsPDF, text: string | string[], y: number, margin: number, usableWidth: number, checkPageBreak: (height: number) => number, options: { isBullet?: boolean, bold?: boolean, indent?: number } = {}) => {
    const { isBullet = false, bold = false, indent = 0 } = options;
    const lineSpacing = 5;

    if (bold) {
        doc.setFont('helvetica', 'bold');
    }

    const prefix = isBullet ? '•  ' : '';
    const textToSplit = Array.isArray(text) ? text.join('\n') : text;
    const textLines = doc.splitTextToSize(prefix + textToSplit, usableWidth - indent);
    
    y = checkPageBreak(textLines.length * lineSpacing);
    doc.text(textLines, margin + indent, y);
    y += textLines.length * lineSpacing;

    if (bold) {
        doc.setFont('helvetica', 'normal');
    }
    return y;
};

export const exportPdf = (data: LessonPlanResponse, fileName: string) => {
    const { plano_aula } = data;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - 2 * margin;
    let y = margin;

    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > pageHeight - margin) {
            doc.addPage();
            return margin;
        }
        return y;
    };
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(plano_aula.titulo, usableWidth);
    y = checkPageBreak(titleLines.length * 10);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 8 + 4;

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const subtitle = `${plano_aula.serie_turma} · ${plano_aula.componente_curricular}`;
    y = checkPageBreak(8);
    doc.text(subtitle, margin, y);
    y += 6;
    const info = `Duração: ${plano_aula.duracao_total_min} min  |  Aulas: ${plano_aula.numero_de_aulas}`;
    y = checkPageBreak(8);
    doc.text(info, margin, y);
    y += 12;

    // --- Fundamentação Pedagógica ---
    y = addSection(doc, 'Fundamentação Pedagógica', y, margin, checkPageBreak);
    y = addText(doc, 'Competência Específica:', y, margin, usableWidth, checkPageBreak, { bold: true });
    y = addText(doc, `${plano_aula.competencia_especifica.codigo}: ${plano_aula.competencia_especifica.texto}`, y, margin, usableWidth, checkPageBreak, { indent: 5 });
    y += 4;
    y = addText(doc, 'Habilidades:', y, margin, usableWidth, checkPageBreak, { bold: true });
    plano_aula.habilidades.forEach(h => { y = addText(doc, `${h.codigo}: ${h.texto}`, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 5 }); });
    y += 4;
    y = addText(doc, 'Objetivos de Aprendizagem:', y, margin, usableWidth, checkPageBreak, { bold: true });
    plano_aula.objetivos_de_aprendizagem.forEach(o => { y = addText(doc, o, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 5 }); });
    if (plano_aula.descritores && plano_aula.descritores.length > 0) {
        y += 4;
        y = addText(doc, 'Descritor(es):', y, margin, usableWidth, checkPageBreak, { bold: true });
        plano_aula.descritores.forEach(d => { y = addText(doc, `${d.codigo}: ${d.texto}`, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 5 }); });
    }

    // --- Metodologia e Atividades ---
    y = addSection(doc, 'Metodologia e Atividades', y+8, margin, checkPageBreak);
    plano_aula.metodologia.forEach(etapa => {
        y = checkPageBreak(8);
        y = addText(doc, `${etapa.etapa} (${etapa.duracao_min} min)`, y, margin, usableWidth, checkPageBreak, { bold: true });
        y = addText(doc, 'Atividades:', y, margin, usableWidth, checkPageBreak, { indent: 5 });
        etapa.atividades.forEach(a => { y = addText(doc, a, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 10 }); });
        if (etapa.recursos.length > 0) {
            y = addText(doc, `Recursos: ${etapa.recursos.join(', ')}`, y, margin, usableWidth, checkPageBreak, { indent: 5 });
        }
        y += 4;
    });

    // --- Avaliação ---
    y = addSection(doc, 'Avaliação', y+4, margin, checkPageBreak);
    y = addText(doc, 'Critérios de Avaliação:', y, margin, usableWidth, checkPageBreak, { bold: true });
    plano_aula.estrategia_de_avaliacao.criterios.forEach(c => { y = addText(doc, c, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 5 }); });
    y += 4;
    y = addText(doc, 'Instrumentos:', y, margin, usableWidth, checkPageBreak, { bold: true });
    y = addText(doc, plano_aula.estrategia_de_avaliacao.instrumentos.join(', '), y, margin, usableWidth, checkPageBreak, { indent: 5 });

    // --- Recursos e Adaptações ---
    y = addSection(doc, 'Recursos e Adaptações', y+8, margin, checkPageBreak);
    y = addText(doc, 'Material de Apoio:', y, margin, usableWidth, checkPageBreak, { bold: true });
    plano_aula.material_de_apoio.forEach(m => { y = addText(doc, `[${m.tipo}] ${m.titulo}: ${m.link}`, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 5 }); });
    y += 4;
    y = addText(doc, 'Adaptações para Alunos com NEE:', y, margin, usableWidth, checkPageBreak, { bold: true });
    plano_aula.adapitacoes_nee.forEach(a => { y = addText(doc, a, y, margin, usableWidth, checkPageBreak, { isBullet: true, indent: 5 }); });

    // --- Observações ---
    y = addSection(doc, 'Observações', y+8, margin, checkPageBreak);
    addText(doc, plano_aula.observacoes, y, margin, usableWidth, checkPageBreak);
    
    doc.save(`${fileName}.pdf`);
};


// ===================================================================================
// TXT EXPORT
// ===================================================================================

const generatePlainText = (data: LessonPlanResponse): string => {
    const { plano_aula } = data;
    let content = `PLANO DE AULA: ${plano_aula.titulo}\n`;
    content += `Série/Turma: ${plano_aula.serie_turma} | Disciplina: ${plano_aula.componente_curricular}\n`;
    content += `Duração: ${plano_aula.duracao_total_min} min | Aulas: ${plano_aula.numero_de_aulas}\n`;
    content += "========================================\n\n";

    content += "FUNDAMENTAÇÃO PEDAGÓGICA\n";
    content += `Competência Específica: ${plano_aula.competencia_especifica.codigo} - ${plano_aula.competencia_especifica.texto}\n`;
    content += "Habilidades:\n";
    plano_aula.habilidades.forEach(h => content += `- ${h.codigo}: ${h.texto}\n`);
    content += "Objetivos de Aprendizagem:\n";
    plano_aula.objetivos_de_aprendizagem.forEach(o => content += `- ${o}\n`);
    if (plano_aula.descritores && plano_aula.descritores.length > 0) {
      content += "Descritor(es):\n";
      plano_aula.descritores.forEach(d => content += `- ${d.codigo}: ${d.texto}\n`);
    }
    content += "\n";

    content += "METODOLOGIA E ATIVIDADES\n";
    plano_aula.metodologia.forEach(etapa => {
        content += `\n--- ${etapa.etapa.toUpperCase()} (${etapa.duracao_min} min) ---\n`;
        content += "Atividades:\n";
        etapa.atividades.forEach(a => content += `- ${a}\n`);
        content += `Recursos: ${etapa.recursos.join(', ')}\n`;
    });
    content += "\n";
    
    content += "AVALIAÇÃO\n";
    content += "Critérios de Avaliação:\n";
    plano_aula.estrategia_de_avaliacao.criterios.forEach(c => content += `- ${c}\n`);
    content += `Instrumentos: ${plano_aula.estrategia_de_avaliacao.instrumentos.join(', ')}\n\n`;

    content += "RECURSOS E ADAPTAÇÕES\n";
    content += "Material de Apoio:\n";
    plano_aula.material_de_apoio.forEach(m => content += `- [${m.tipo}] ${m.titulo}: ${m.link}\n`);
    content += "Adaptações para Alunos com NEE:\n";
    plano_aula.adapitacoes_nee.forEach(a => content += `- ${a}\n\n`);

    content += "OBSERVAÇÕES:\n";
    content += `${plano_aula.observacoes}\n`;

    return content;
};

export const exportTxt = (data: LessonPlanResponse, fileName: string) => {
    const content = generatePlainText(data);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// ===================================================================================
// DOCX EXPORT
// ===================================================================================

const generateDocxObject = (data: LessonPlanResponse): Document => {
    const { plano_aula } = data;
    const children: any[] = [];
    
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(plano_aula.titulo)] }));
    children.push(new Paragraph({ children: [new TextRun({ text: `${plano_aula.serie_turma} - ${plano_aula.componente_curricular}`, italics: true })] }));
    children.push(new Paragraph(""));

    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Fundamentação Pedagógica")] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Competência Específica:', bold: true })] }));
    children.push(new Paragraph({ children: [new TextRun(`${plano_aula.competencia_especifica.codigo}: ${plano_aula.competencia_especifica.texto}`)]}));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Habilidades:', bold: true })] }));
    plano_aula.habilidades.forEach(h => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(`${h.codigo}: ${h.texto}`)] })));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Objetivos de Aprendizagem:', bold: true })] }));
    plano_aula.objetivos_de_aprendizagem.forEach(o => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(o)] })));
    if (plano_aula.descritores && plano_aula.descritores.length > 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: 'Descritor(es):', bold: true })]}));
      plano_aula.descritores.forEach(d => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(`${d.codigo}: ${d.texto}`)] })));
    }
    children.push(new Paragraph(""));
    
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Metodologia e Atividades")] }));
    plano_aula.metodologia.forEach(etapa => {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(`${etapa.etapa} (${etapa.duracao_min} min)`)] }));
        children.push(new Paragraph({ children: [new TextRun({ text: 'Atividades:', bold: true })] }));
        etapa.atividades.forEach(a => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(a)] })));
        children.push(new Paragraph({ children: [new TextRun({ text: 'Recursos:', bold: true }), new TextRun({ text: ` ${etapa.recursos.join(', ')}`, italics: true })] }));
    });
    children.push(new Paragraph(""));
    
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Avaliação")] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Critérios de Avaliação:', bold: true })] }));
    plano_aula.estrategia_de_avaliacao.criterios.forEach(c => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(c)] })));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Instrumentos:', bold: true }), new TextRun({ text: ` ${plano_aula.estrategia_de_avaliacao.instrumentos.join(', ')}` })] }));
    children.push(new Paragraph(""));
    
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Recursos e Adaptações")] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Material de Apoio:', bold: true })] }));
    plano_aula.material_de_apoio.forEach(m => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(`[${m.tipo}] ${m.titulo}: ${m.link}`)] })));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Adaptações para Alunos com NEE:', bold: true })] }));
    plano_aula.adapitacoes_nee.forEach(a => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(a)] })));
    children.push(new Paragraph(""));

    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Observações")] }));
    children.push(new Paragraph(plano_aula.observacoes));

    return new Document({ sections: [{ children }] });
};

export const exportDocx = async (data: LessonPlanResponse, fileName: string) => {
    const doc = generateDocxObject(data);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
