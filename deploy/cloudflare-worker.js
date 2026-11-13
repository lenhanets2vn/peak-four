// Bind this Worker to YOUR_DOMAIN/* after enabling Cloudflare WAF on the zone.
// Secrets: ORIGIN_VERIFY_SECRET, ORIGIN_URL=https://YOUR_SERVICE.onrender.com
export default {
  async fetch(request, env) {
    const publicUrl = new URL(request.url);
    if (publicUrl.protocol !== 'https:') {publicUrl.protocol='https:';return Response.redirect(publicUrl.toString(),301);}
    const origin = new URL(env.ORIGIN_URL);
    if(origin.protocol!=='https:')return new Response('Origin requires HTTPS',{status:503});
    const target = new URL(origin.origin);target.pathname=publicUrl.pathname;target.search=publicUrl.search;
    const headers = new Headers(request.headers);
    headers.delete('host');headers.delete('x-forwarded-for');headers.delete('x-forwarded-host');
    headers.set('x-origin-verify',env.ORIGIN_VERIFY_SECRET);
    headers.set('x-waf-client-ip',request.headers.get('cf-connecting-ip') || 'unknown');
    headers.set('x-forwarded-proto','https');
    return fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'});
  }
};
