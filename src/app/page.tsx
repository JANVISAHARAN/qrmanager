export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-semibold mb-3">QR Code Management System</h1>
        <p className="text-gray-600 mb-6">
          This is a backend-focused assessment project. Use the REST API endpoints documented in{' '}
          <code>README.md</code> (or the Postman collection) to generate, verify, and print QR
          codes. A minimal UI can be built here if desired.
        </p>
        <div className="text-left bg-gray-50 rounded-lg p-4 text-sm font-mono">
          <p>POST /api/qr/generate</p>
          <p>GET /api/qr</p>
          <p>GET /api/qr/:uniqueCode</p>
          <p>DELETE /api/qr/:uniqueCode</p>
          <p>GET /verify/:uniqueCode</p>
          <p>POST /api/qr/upload-logo</p>
          <p>POST /api/qr/print-layout</p>
          <p>GET /api/qr/:uniqueCode/scanlogs</p>
          <p>PATCH /api/qr/:uniqueCode/activate</p>
        </div>
      </div>
    </main>
  );
}
