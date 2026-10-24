abstract class Report {
  abstract readonly format: string;

  constructor(readonly title: string) {}

  protected abstract renderBody(items: string[]): string;

  render(items: string[]): string {
    return `# ${this.title} (${this.format})\n${this.renderBody(items)}`;
  }
}

class MarkdownReport extends Report {
  readonly format = 'markdown';

  protected renderBody(items: string[]): string {
    return items.map((item) => `- ${item}`).join('\n');
  }
}

class NumberedReport extends Report {
  readonly format = 'numbered';

  protected renderBody(items: string[]): string {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }
}
