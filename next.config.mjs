/** @type {import('next').NextConfig} */
const nextConfig = {
  // The database updates page reads the SQL files at run time, so they have to travel with the deployed route
  outputFileTracingIncludes: { "/api/admin/setup": ["./supabase/migrations/**/*"] },
};
export default nextConfig;
