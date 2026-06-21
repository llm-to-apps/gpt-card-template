import { generateCardMetadata, renderCardPage } from '../card-page';

export async function generateMetadata() {
  return generateCardMetadata('book');
}

export default async function BookPage() {
  return renderCardPage('book');
}
