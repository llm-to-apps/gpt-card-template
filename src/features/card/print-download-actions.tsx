'use client';

import { Button, Group, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Download } from 'lucide-react';
import { useState } from 'react';

const DPI_OPTIONS = ['300', '600', '1200'];

export function PrintDownloadActions({
  backSvgId,
  cardHeightIn,
  cardWidthIn,
  frontSvgId
}: {
  backSvgId: string;
  cardHeightIn: number;
  cardWidthIn: number;
  frontSvgId: string;
}) {
  const [dpi, setDpi] = useState('600');
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(side: 'back' | 'front') {
    const svgId = side === 'front' ? frontSvgId : backSvgId;
    const filename = `gpt-card-${side}-${dpi}dpi.png`;

    setDownloading(side);
    try {
      await downloadSvgAsPng({
        dpi: Number(dpi),
        filename,
        heightIn: cardHeightIn,
        svgId,
        widthIn: cardWidthIn
      });
    } catch {
      notifications.show({
        color: 'red',
        message:
          'Could not export PNG. Upload the profile photo in GPT Card, then try again.'
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Group className="print-download-actions" gap="xs" justify="center">
      <Select
        allowDeselect={false}
        data={DPI_OPTIONS.map((value) => ({
          label: `${value} DPI`,
          value
        }))}
        value={dpi}
        w={130}
        onChange={(value) => {
          if (value) {
            setDpi(value);
          }
        }}
      />
      <Button
        leftSection={<Download size={16} />}
        loading={downloading === 'front'}
        variant="light"
        onClick={() => void download('front')}
      >
        Front PNG
      </Button>
      <Button
        leftSection={<Download size={16} />}
        loading={downloading === 'back'}
        variant="light"
        onClick={() => void download('back')}
      >
        Back PNG
      </Button>
    </Group>
  );
}

async function downloadSvgAsPng({
  dpi,
  filename,
  heightIn,
  svgId,
  widthIn
}: {
  dpi: number;
  filename: string;
  heightIn: number;
  svgId: string;
  widthIn: number;
}) {
  const svg = document.getElementById(svgId);

  if (!(svg instanceof SVGSVGElement)) {
    throw new Error(`SVG not found: ${svgId}`);
  }

  const widthPx = Math.round(widthIn * dpi);
  const heightPx = Math.round(heightIn * dpi);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(widthPx));
  clone.setAttribute('height', String(heightPx));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  await prepareSvgCloneForCanvas(clone);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], {
    type: 'image/svg+xml;charset=utf-8'
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available');
    }

    context.drawImage(image, 0, 0, widthPx, heightPx);
    const pngBlob = await canvasToPngBlob(canvas);
    const pngUrl = URL.createObjectURL(pngBlob);

    try {
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
    } finally {
      URL.revokeObjectURL(pngUrl);
    }
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function prepareSvgCloneForCanvas(svg: SVGSVGElement) {
  await inlineSvgImages(svg);
  replaceForeignObjectsWithSvgText(svg);
}

function ensureForeignObjectNamespaces(svg: SVGSVGElement) {
  svg.querySelectorAll('foreignObject').forEach((foreignObject) => {
    foreignObject.querySelectorAll('*').forEach((element) => {
      if (!element.getAttribute('xmlns')) {
        element.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      }
    });
  });
}

async function inlineSvgImages(svg: SVGSVGElement) {
  const images = Array.from(svg.querySelectorAll('image'));

  await Promise.all(
    images.map(async (image) => {
      const href =
        image.getAttribute('href') ??
        image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');

      if (!href || href.startsWith('data:')) {
        return;
      }

      try {
        const dataUrl = await fetchAsDataUrl(href);
        image.setAttribute('href', dataUrl);
        image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      } catch {
        image.remove();
      }
    })
  );
}

function replaceForeignObjectsWithSvgText(svg: SVGSVGElement) {
  const namespace = 'http://www.w3.org/2000/svg';

  svg.querySelectorAll('foreignObject').forEach((foreignObject) => {
    const x = Number(foreignObject.getAttribute('x') ?? 0);
    const y = Number(foreignObject.getAttribute('y') ?? 0);
    const width = Number(foreignObject.getAttribute('width') ?? 0);
    const textContent = foreignObject.textContent?.trim();

    if (!textContent) {
      foreignObject.remove();
      return;
    }

    const text = document.createElementNS(namespace, 'text');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y + 19));
    text.setAttribute('font-family', 'Inter, Arial, sans-serif');
    text.setAttribute('font-size', '19');
    text.setAttribute('fill', '#374151');

    wrapTextForSvgExport(
      textContent,
      Math.max(1, Math.floor(width / 10.5)),
      3
    ).forEach((line, index) => {
      const tspan = document.createElementNS(namespace, 'tspan');
      tspan.setAttribute('x', String(x));
      tspan.setAttribute('dy', index === 0 ? '0' : '27');
      tspan.textContent = line;
      text.append(tspan);
    });

    foreignObject.replaceWith(text);
  });
}

function wrapTextForSvgExport(
  value: string,
  maxCharacters: number,
  maxLines: number
) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharacters || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (
    lines.length === maxLines &&
    words.join(' ').length > lines.join(' ').length
  ) {
    lines[maxLines - 1] = `${lines[maxLines - 1]
      .slice(0, Math.max(0, maxCharacters - 1))
      .trimEnd()}...`;
  }

  return lines;
}

async function fetchAsDataUrl(url: string) {
  const response = await fetch(url, { mode: 'cors' });

  if (!response.ok) {
    throw new Error(`Could not load image: ${url}`);
  }

  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read image'));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render SVG as PNG'));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Could not create PNG'));
    }, 'image/png');
  });
}
