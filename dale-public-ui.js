(()=>{"use strict";
const $=id=>document.getElementById(id),client=window.supabase?.createClient("https://mjsoffmcekzhenuyfzud.supabase.co",window.DALE_SUPABASE_KEY);
const menu=$("menuBtn"),nav=$("nav");
menu.onclick=()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));menu.textContent=open?"×":"☰"};
for(const a of nav.querySelectorAll("a"))a.onclick=()=>{nav.classList.remove("open");menu.textContent="☰";menu.setAttribute("aria-expanded","false")};
for(const [button,target] of [["scrollBooking","booking"],["scrollRates","rates"]])$(button).onclick=()=>$(target).scrollIntoView({behavior:"smooth"});
const php=n=>"₱"+Number(n).toLocaleString("en-PH");const estimate=()=>{const p=Number($("estimatePlayers").value),h=Number($("estimateHours").value),rate=1000+(p-1)*350;$("estimateTotal").textContent=php(rate*h);$("estimateBreakdown").textContent=php(rate)+" per hour × "+h+" hour(s) · "+p+" player(s)"};
$("estimatePlayers").onchange=estimate;$("estimateHours").onchange=estimate;estimate();
let gallery=[],current=0;
function setSlide(index){const carousel=$("galleryCarousel");if(!gallery.length)return;current=index%gallery.length;const card=carousel.children[current];if(card)carousel.scrollTo({left:card.offsetLeft-carousel.offsetLeft,behavior:"smooth"});for(const [i,dot] of [...$("galleryDots").children].entries())dot.classList.toggle("active",i===current)}
async function galleryLoad(){
 if(!client)return;
 const {data,error}=await client.from("dale_gallery").select("image_path,caption,display_order").eq("is_published",true).order("display_order").order("created_at",{ascending:false}).limit(30);
 if(error){console.warn("Gallery unavailable:",error.message);return}
 gallery=data||[];const section=$("gallerySection"),link=nav.querySelector('a[href="#gallerySection"]');section.hidden=gallery.length===0;if(link)link.hidden=gallery.length===0;
 const wrap=$("galleryCarousel"),dots=$("galleryDots");wrap.replaceChildren();dots.replaceChildren();
 for(const [i,item] of gallery.entries()){
  const card=document.createElement("div");card.className="gallery-card";
  const img=document.createElement("img");img.loading="lazy";img.alt=item.caption||"Coach Dale pickleball training photo";
  img.src=client.storage.from("dale-gallery").getPublicUrl(item.image_path).data.publicUrl;card.append(img);
  if(item.caption){const txt=document.createElement("div");txt.className="gallery-caption";txt.textContent=item.caption;card.append(txt)}
  wrap.append(card);const dot=document.createElement("span");dot.className=i===0?"active":"";dots.append(dot)
 }
 if(gallery.length>1)setInterval(()=>setSlide(current+1),10000);
}
async function testimonialsLoad(){
 if(!client)return;
 const {data,error}=await client.from("dale_testimonials").select("player_name,rating,quote,anonymous,created_at").eq("approved",true).order("created_at",{ascending:false}).limit(24);
 if(error){console.warn("Reviews unavailable:",error.message);return}
 const list=$("testimonialList");list.replaceChildren();
 if(!data?.length){const none=document.createElement("div");none.className="testimonial-empty";none.textContent="Coach Dale's approved player testimonials will appear here.";list.append(none);return}
 for(const r of data){
  const card=document.createElement("article");card.className="testimonial-card";
  const stars=document.createElement("div");stars.className="testimonial-stars";stars.textContent="★".repeat(r.rating)+"☆".repeat(5-r.rating);
  const quote=document.createElement("blockquote");quote.textContent=r.quote;
  const footer=document.createElement("footer");const name=document.createElement("b");name.textContent=r.anonymous?"Anonymous Player":r.player_name;const date=document.createElement("time");date.textContent=new Date(r.created_at).toLocaleDateString("en-PH",{year:"numeric",month:"short"});footer.append(name,date);card.append(stars,quote,footer);list.append(card)
 }
}
$("testimonialForm").onsubmit=async event=>{
 event.preventDefault();const status=$("testimonialStatus"),btn=$("testimonialSubmitBtn");if(!client){status.textContent="Reviews are unavailable.";return}
 const player_name=$("testimonialName").value.trim(),quote=$("testimonialQuote").value.trim(),rating=Number($("testimonialRating").value),anonymous=$("testimonialAnonymous").checked;
 if(player_name.length<2||quote.length<10){status.textContent="Enter your name and at least 10 characters.";return}
 btn.disabled=true;status.className="testimonial-status";status.textContent="Sending for approval…";
 const {error}=await client.from("dale_testimonials").insert({player_name,rating,quote,anonymous,approved:false});
 if(error){status.classList.add("err");status.textContent="Unable to submit review. Please retry."}
 else{$("testimonialForm").reset();status.classList.add("ok");status.textContent="Thank you! Your testimonial is pending Coach Dale's approval."}
 btn.disabled=false
};
galleryLoad();testimonialsLoad();
})();