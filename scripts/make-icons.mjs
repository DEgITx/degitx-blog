/**
 * One-off generator for the favicon / app-icon set.
 *
 * The mark is the same "DX" monogram the site header uses, so the browser tab
 * matches the page. Run with `npm run icons` after changing the brand colours.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import CanvasKitInit from 'canvaskit-wasm';

const OUT = 'public';
const FONT = 'src/assets/fonts/Inter-Bold.ttf';

const BG = '#16181d';
const FG = '#f8fafc';
const ACCENT = '#6084ff';

const SIZES = [
  { file: 'favicon.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const CanvasKit = await CanvasKitInit();
const fontData = await fs.readFile(FONT);

function draw(size) {
  const surface = CanvasKit.MakeSurface(size, size);
  if (!surface) throw new Error(`could not create a ${size}px surface`);
  const canvas = surface.getCanvas();

  const s = size / 512; // all geometry below is authored at 512px

  // Rounded-square plate with a subtle accent wash in the lower corner.
  const plate = new CanvasKit.Paint();
  plate.setAntiAlias(true);
  plate.setColor(CanvasKit.parseColorString(BG));
  const rect = CanvasKit.RRectXY(CanvasKit.LTRBRect(0, 0, size, size), 112 * s, 112 * s);
  canvas.drawRRect(rect, plate);

  const wash = new CanvasKit.Paint();
  wash.setAntiAlias(true);
  wash.setShader(
    CanvasKit.Shader.MakeLinearGradient(
      [0, 0],
      [size, size],
      [CanvasKit.parseColorString(ACCENT + '00'), CanvasKit.parseColorString(ACCENT + '59')],
      null,
      CanvasKit.TileMode.Clamp
    )
  );
  canvas.drawRRect(rect, wash);

  // Monogram
  const fontMgr = CanvasKit.FontMgr.FromData(fontData);
  const paraStyle = new CanvasKit.ParagraphStyle({
    textStyle: {
      color: CanvasKit.parseColorString(FG),
      fontFamilies: ['Inter'],
      fontSize: 232 * s,
      letterSpacing: -8 * s,
    },
    textAlign: CanvasKit.TextAlign.Center,
  });

  const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
  builder.addText('DX');
  const paragraph = builder.build();
  paragraph.layout(size);
  canvas.drawParagraph(paragraph, 0, (size - paragraph.getHeight()) / 2);

  const image = surface.makeImageSnapshot();
  const bytes = image.encodeToBytes(CanvasKit.ImageFormat.PNG, 100);

  paragraph.delete();
  builder.delete();
  fontMgr.delete();
  image.delete();
  surface.delete();
  plate.delete();
  wash.delete();

  if (!bytes) throw new Error('PNG encode failed');
  return Buffer.from(bytes);
}

for (const { file, size } of SIZES) {
  await fs.writeFile(path.join(OUT, file), draw(size));
  console.log(`${file}  ${size}x${size}`);
}
