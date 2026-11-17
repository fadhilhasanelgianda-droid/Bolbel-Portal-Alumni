import { ImageResponse } from 'next/og';

export const alt = 'Portal Karier Alumni Boleh Belajar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 96,
          background: '#F9EDDE',
          color: '#242424',
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: '#BD214C' }}>Boleh Belajar</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>Portal Karier Alumni</div>
        <div style={{ fontSize: 34, marginTop: 28, color: '#595959' }}>
          Lowongan terkurasi, profil & CV, dan pemantauan proses seleksi.
        </div>
      </div>
    ),
    size
  );
}
