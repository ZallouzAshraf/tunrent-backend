import * as handlebars from 'handlebars';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export function registerMailTemplatePartials(templatesDir: string): void {
  handlebars.registerHelper('concat', (...args: unknown[]) => {
    args.pop();
    return args.join('');
  });

  const partialsDir = join(templatesDir, 'partials');

  if (!existsSync(partialsDir)) {
    return;
  }

  for (const file of readdirSync(partialsDir)) {
    if (!file.endsWith('.hbs')) {
      continue;
    }

    const name = file.replace(/\.hbs$/, '');
    handlebars.registerPartial(
      name,
      readFileSync(join(partialsDir, file), 'utf8'),
    );
  }
}
