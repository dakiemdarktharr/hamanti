// Hand attachment math only. One reversible scroll coordinate drives the
// opening, skeletal poses and the website's category-card fan.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};

export function samplePad(motion,frame,side){
  const f=clamp(frame,0,motion.frames-1),lo=Math.floor(f),hi=Math.min(lo+1,motion.frames-1);
  return motion.poses[lo][side].pad.map((v,i)=>mix(v,motion.poses[hi][side].pad[i],f-lo));
}

export function handFrame(layout,frame,motion){
  const progress=frame.browse??(layout.count<=layout.slots?0:frame.centre-(layout.slots-1)/2);
  // Derive skeletal phase from the original fan's progress. Never retime cards
  // to fit the imported clip. Reversing scroll retraces the same hand poses.
  const cycle=Math.floor(progress+1e-9),phase=clamp(progress-cycle);
  return {progress,cycle,phase,opening:frame.opening??1,reach:frame.reach??1,spread:frame.spread??1,
    sourceFrame:(frame.opening??1)<1?(frame.spread??1)*60:60+phase*60,
    scale:layout.cardWidth*.095,thumbY:layout.journeyHeight*.68,
    // The source rig's fitted support gap is below the distal pad landmark.
    // Using that landmark as the paper plane cuts through the thumb shaft.
    plane:motion.gripPlane??3.55};
}

export function cardContact(pose,layout,side){
  // A material point on the existing card, in its own local coordinates.
  // Apply precisely the card's final rotation and scale, including spring.
  const x=(side==='left'?-1:1)*.34*layout.cardWidth*pose.scale;
  // Grip the lower margin. An interior contact puts the thumb's proximal
  // joint through the paper plane and leaves a severed-looking distal tip.
  const y=.43*layout.cardHeight*pose.scale;
  const a=pose.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return {x:pose.x+x*c-y*s,y:layout.journeyHeight*.47+pose.y+x*s+y*c};
}

export function handAttachment(side,layout,state,poseAt){
  const {cycle,phase}=state;
  if(state.opening<1){
    const card=Math.min(layout.count-1,side==='left'?1:3);
    const contact=cardContact(poseAt(Math.max(0,card)),layout,side);
    return {...contact,y:contact.y+(1-state.reach)*(layout.journeyHeight+layout.cardHeight*.7),lift:0,from:card,to:card,regrip:0};
  }
  const last=Math.max(0,Math.min(layout.count-1,Math.floor(layout.slots-1)));
  // Change which card the hand follows only while its thumb is lifted.
  // The seam is continuous: the end target is the next cycle's start target.
  const regrip=side==='left'?smooth((phase-.10)/.28):smooth((phase-.55)/.30);
  // Work on the inner cards. Following the outer card into a distant pile
  // would stretch the hands apart and tear the shared grip open.
  const from=side==='left'?cycle+Math.max(0,last-3):cycle+Math.max(0,last-1);
  const to=from+1;
  const a=cardContact(poseAt(clamp(from,0,layout.count-1)),layout,side);
  const b=cardContact(poseAt(clamp(to,0,layout.count-1)),layout,side);
  const lift=side==='left'
    ?smooth(phase/.10)*(1-smooth((phase-.38)/.12))
    :smooth((phase-.43)/.12)*(1-smooth((phase-.85)/.15));
  return {x:mix(a.x,b.x,regrip),y:mix(a.y,b.y,regrip),lift,from,to,regrip};
}

export function demoScroll(frame,layout){
  // Nine-second review: rise/open, browse enough to fill the four-card pile,
  // then retrace all the way to the untouched stack and hidden hands.
  const f=clamp(frame,0,540),t=f<=270?f/270:(540-f)/270;
  const distance=2.6+Math.min(6,Math.max(0,layout.count-layout.slots));
  return layout.sectionStart+layout.pitch*distance*smooth(t);
}
