(() => {
const URL='https://mjsoffmcekzhenuyfzud.supabase.co',KEY='PENDING_DALE_PUBLISHABLE_KEY';
const db=window.supabase?.createClient(URL,KEY),$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const niceDate=s=>{try{return new Date(s+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}catch{return s}};
async function loadGallery(){
 const root=$('#galleryCarousel'),section=$('#gallerySection'),dots=$('#galleryDots'); if(!root||!db)return;
 const {data,error}=await db.from('gallery_images').select('id,storage_path,caption,sort_order').eq('is_visible',true).order('sort_order').order('created_at');
 if(error||!data?.length){section?.classList.add('hidden-public');return}
 section?.classList.remove('hidden-public');
 root.innerHTML=data.map((x,i)=>{const {data:u}=db.storage.from('coach-dale-gallery').getPublicUrl(x.storage_path);return `<article class="gallery-card" data-gallery-index="${i}"><img src="${esc(u.publicUrl)}" alt="${esc(x.caption||'Coach Dale coaching photo')}" loading="lazy">${x.caption?`<div class="gallery-caption">${esc(x.caption)}</div>`:''}</article>`}).join('');
 dots.innerHTML=data.map((_,i)=>`<span class="${i===0?'active':''}"></span>`).join('');
 const cards=[...root.querySelectorAll('.gallery-card')], ds=[...dots.children];
 const setDot=i=>ds.forEach((d,n)=>d.classList.toggle('active',n===i));
 root.addEventListener('scroll',()=>{const w=cards[0]?.offsetWidth||1,gap=18;setDot(Math.max(0,Math.min(cards.length-1,Math.round(root.scrollLeft/(w+gap)))))},{passive:true});
}
async function loadTestimonials(){
 const root=$('#testimonialList'); if(!root||!db)return;
 const {data,error}=await db.from('testimonials').select('id,display_name,quote,rating,is_anonymous,submitted_at,sort_order').eq('is_published',true).eq('review_status','approved').order('sort_order').order('created_at',{ascending:false}).limit(12);
 if(error||!data?.length){root.innerHTML='<div class="testimonial-empty">No published testimonials yet.</div>';return}
 root.innerHTML=data.map(t=>`<article class="testimonial-card"><div class="testimonial-stars" aria-label="${t.rating} out of 5 stars">${'★'.repeat(Number(t.rating||0))}${'☆'.repeat(5-Number(t.rating||0))}</div><blockquote>“${esc(t.quote)}”</blockquote><footer><strong>${t.is_anonymous?'Anonymous':esc(t.display_name)}</strong><span>${esc(niceDate(t.submitted_at))}</span></footer></article>`).join('');
}
function wireTestimonial(){
 const form=$('#testimonialForm'),status=$('#testimonialStatus'); if(!form||!db)return;
 form.addEventListener('submit',async e=>{e.preventDefault();const btn=$('#testimonialSubmitBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='Sending…';status.className='testimonial-status';status.textContent='';
  const name=$('#testimonialName').value.trim(),rating=Number($('#testimonialRating').value),quote=$('#testimonialQuote').value.trim(),anon=$('#testimonialAnonymous').checked;
  try{const {error}=await db.rpc('submit_public_testimonial_v1',{p_display_name:name,p_rating:rating,p_quote:quote,p_is_anonymous:anon});if(error)throw error;form.reset();status.className='testimonial-status ok';status.textContent='Thank you! Your testimonial was submitted for Coach Dale’s approval.'}
  catch(err){status.className='testimonial-status err';status.textContent=err.message||'Could not submit testimonial.'}
  finally{btn.disabled=false;btn.textContent=old}
 });
}
function init(){loadGallery();loadTestimonials();wireTestimonial()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();