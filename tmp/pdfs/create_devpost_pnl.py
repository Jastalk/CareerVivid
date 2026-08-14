from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "CareerVivid_Devpost_PandL_May-August_2026.pdf"


def money(value):
    if value < 0:
        return f"(${abs(value):,.2f})"
    return f"${value:,.2f}"


def paragraph(text, style):
    return Paragraph(text, style)


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        leftMargin=0.72 * inch,
        rightMargin=0.72 * inch,
        topMargin=0.62 * inch,
        bottomMargin=0.58 * inch,
        title="CareerVivid Profit and Loss Statement",
        author="CareerVivid",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="TitleClean",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1E2A3A"),
        alignment=TA_LEFT,
        spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name="SubtitleClean",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.2,
        leading=14,
        textColor=colors.HexColor("#536273"),
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1E2A3A"),
        spaceBefore=12,
        spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="BodyClean",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.9,
        leading=12.6,
        textColor=colors.HexColor("#273443"),
    ))
    styles.add(ParagraphStyle(
        name="Footnote",
        parent=styles["BodyText"],
        fontName="Helvetica-Oblique",
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor("#536273"),
    ))

    text_style = styles["BodyClean"]
    right_style = ParagraphStyle(
        "RightCell", parent=text_style, alignment=TA_RIGHT, fontName="Helvetica"
    )
    bold_style = ParagraphStyle(
        "BoldCell", parent=text_style, fontName="Helvetica-Bold"
    )
    bold_right_style = ParagraphStyle(
        "BoldRightCell", parent=right_style, fontName="Helvetica-Bold"
    )

    story = [
        paragraph("CareerVivid", styles["TitleClean"]),
        paragraph("Founder-reported Profit and Loss Statement", styles["SubtitleClean"]),
        paragraph("Reporting period: May 20, 2026 through August 13, 2026 | Currency: USD", styles["SubtitleClean"]),
        HRFlowable(width="100%", thickness=0.7, color=colors.HexColor("#C7D3DF")),
        paragraph("Summary", styles["Section"]),
    ]

    summary = [
        [paragraph("Total revenue", bold_style), paragraph(money(72.99), bold_right_style)],
        [paragraph("Cost of goods sold", text_style), paragraph(money(0), right_style)],
        [paragraph("Gross profit", bold_style), paragraph(money(72.99), bold_right_style)],
        [paragraph("Operating expenses", text_style), paragraph(money(262.00), right_style)],
        [paragraph("Net income (loss)", bold_style), paragraph(money(-189.01), bold_right_style)],
    ]
    summary_table = Table(summary, colWidths=[4.6 * inch, 1.5 * inch], hAlign="LEFT")
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF2F8")),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#F6F8FA")),
        ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#F8F1E8")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8E0E8")),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story += [summary_table, paragraph("Revenue detail", styles["Section"])]

    revenue = [
        [paragraph("Month", bold_style), paragraph("Revenue", bold_right_style), paragraph("Reported source", bold_style)],
        [paragraph("May 2026", text_style), paragraph(money(2.99), right_style), paragraph("One-time payment", text_style)],
        [paragraph("June 2026", text_style), paragraph(money(0), right_style), paragraph("No reported revenue", text_style)],
        [paragraph("July 2026", text_style), paragraph(money(60.00), right_style), paragraph("Six $10 monthly payments", text_style)],
        [paragraph("August 2026 (through Aug. 13)", text_style), paragraph(money(10.00), right_style), paragraph("Monthly payment", text_style)],
        [paragraph("Total revenue", bold_style), paragraph(money(72.99), bold_right_style), paragraph("", bold_style)],
    ]
    revenue_table = Table(revenue, colWidths=[2.55 * inch, 1.3 * inch, 2.25 * inch], hAlign="LEFT")
    revenue_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E2A3A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#EAF2F8")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8E0E8")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story += [revenue_table, paragraph("Operating expense detail", styles["Section"])]

    expenses = [
        [paragraph("Expense", bold_style), paragraph("Amount", bold_right_style), paragraph("Classification", bold_style)],
        [paragraph("Google One Ultra subscriptions (2 x $100)", text_style), paragraph(money(200.00), right_style), paragraph("Research and development tooling", text_style)],
        [paragraph("Plus subscription", text_style), paragraph(money(20.00), right_style), paragraph("Research and development tooling", text_style)],
        [paragraph("Software charges (3 x $14)", text_style), paragraph(money(42.00), right_style), paragraph("Research and development tooling", text_style)],
        [paragraph("Total operating expenses", bold_style), paragraph(money(262.00), bold_right_style), paragraph("", bold_style)],
        [paragraph("Cost of goods sold", text_style), paragraph(money(0), right_style), paragraph("No separately recorded direct COGS", text_style)],
        [paragraph("Marketing and customer acquisition", text_style), paragraph(money(0), right_style), paragraph("No paid marketing reported", text_style)],
    ]
    expense_table = Table(expenses, colWidths=[3.15 * inch, 1.05 * inch, 1.9 * inch], hAlign="LEFT")
    expense_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E2A3A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#F8F1E8")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.35, colors.HexColor("#D8E0E8")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story += [expense_table]

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
