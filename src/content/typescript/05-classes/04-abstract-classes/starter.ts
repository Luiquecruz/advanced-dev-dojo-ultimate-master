// TODO: make Report abstract and declare format and renderBody as abstract members
class Report {
  readonly format: string = 'unknown';

  constructor(readonly title: string) {}

  protected renderBody(items: string[]): string {
    throw new Error('renderBody is not implemented');
  }

  render(items: string[]): string {
    return `# ${this.title} (${this.format})\n${this.renderBody(items)}`;
  }
}

// TODO: implement format and renderBody
class MarkdownReport extends Report {}

// TODO: implement format and renderBody
class NumberedReport extends Report {}
