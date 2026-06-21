import { generateCardMetadata, renderCardPage } from '../card-page';

export async function generateMetadata() {
  return generateCardMetadata('contacts');
}

export default async function ContactsPage() {
  return renderCardPage('contacts');
}
