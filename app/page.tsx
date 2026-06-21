import { generateCardMetadata, renderCardPage } from './card-page';

export async function generateMetadata() {
  return generateCardMetadata('profile');
}

export default async function HomePage() {
  return renderCardPage('profile');
}
