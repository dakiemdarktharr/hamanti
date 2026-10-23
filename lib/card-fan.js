const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = t => t * t * (3 - 2 * t);
const join = (from, to, slope, t) => (2*t*t*t-3*t*t+1)*from + (t*t*t-2*t*t+t)*slope + (-2*t*t*t+3*t*t)*to;

// A small, bounded torsion spring responds to actual scroll velocity. The exact
// damped solution gives the same feel on 60/120 Hz displays and stops at rest.
export function stepFanSpring(previous, scroll, time, enabled=true) {
  const rest={value:0,velocity:0,scroll,time,awake:false};
  if(!enabled || !previous || time-previous.time>150 || Math.abs(scroll-previous.scroll)>900)return rest;
  const dt=(time-previous.time)/1000;
  if(dt<=0)return previous;
  const speed=(scroll-previous.scroll)/dt;
  const target=Math.abs(speed)<30 ? 0 : clamp(speed/1200,-1,1);
  const frequency=17,damping=.68,decayRate=frequency*damping;
  const oscillation=frequency*Math.sqrt(1-damping*damping);
  const displacement=previous.value-target;
  const decay=Math.exp(-decayRate*dt),sine=Math.sin(oscillation*dt),cosine=Math.cos(oscillation*dt);
  const value=target+decay*(displacement*cosine+(previous.velocity+decayRate*displacement)/oscillation*sine);
  const velocity=decay*(previous.velocity*cosine-(decayRate*previous.velocity+frequency*frequency*displacement)/oscillation*sine);
  return Math.abs(value)<.002 && Math.abs(velocity)<.02 && target===0 ? rest
    : {value,velocity,scroll,time,awake:true};
}

// One scroll coordinate drives the whole hand. Seeking backwards retraces the
// same poses, including the small incoming and outgoing piles at the edges.
export function fanFrame(layout, scroll, viewport) {
  const travel = Math.max(0, (layout.count - layout.slots) * layout.pitch);
  const openingDistance=layout.pitch*2.6;
  const progress = clamp(scroll - layout.sectionStart, 0, openingDistance+travel);
  const opening=clamp(progress/openingDistance,0,1);
  const browse=Math.max(0,progress-openingDistance)/layout.pitch;
  return {
    origin: layout.sectionStart + progress - scroll,
    opening,reach:smooth(clamp(opening/.42,0,1)),spread:smooth(clamp((opening-.46)/.54,0,1)),browse,
    deposited:Math.min(4,Math.max(0,Math.floor(browse-1.45+1e-7)+1)),
    centre: layout.count <= layout.slots ? (layout.count - 1) / 2 : browse + (layout.slots - 1) / 2,
  };
}

export const fanScrollLength=layout=>layout.pitch*(2.6+Math.max(0,layout.count-layout.slots));

export function fanDeckPose(side, layout, frame, viewport) {
  const mobile=layout.slots<2;
  const scale=mobile?.22:.42;
  return {
    x:frame.origin + (side>0 ? viewport-layout.gutter-layout.cardWidth*scale/2 : layout.gutter+layout.cardWidth*scale/2),
    y:layout.cardHeight*(side>0 ? (mobile?-.48:-.5) : (mobile?.4:.56)),
    scale,
  };
}

export function fanPose(index, layout, frame, viewport) {
  const {cardWidth:width, cardHeight:height, slots} = layout;
  const distance = index - frame.centre;
  const mobile = slots < 2;
  const half = mobile ? 1 : (slots - 1) / 2;
  const turn = (mobile ? 12 : 33) * Math.PI / 180;
  const extent = Math.abs(distance) / half;
  const angle = clamp(distance / half, -1, 1) * turn;
  // Five cards rotate about one lower pivot, like a real two-thumb fan.
  const radius = height*.46;
  const pivot=(layout.journeyHeight||height*1.65)*.20+height*.14;
  let x = radius * Math.sin(angle);
  let y = mobile ? 0 : pivot-radius*Math.cos(angle);
  let rotation = angle * 180 / Math.PI;
  let scale = 1, opacity = 1,flip=0;

  if (extent > 1) {
    // Beyond the five main cards: fold down from the incoming pile on the
    // right, then settle into the outgoing pile on the left. No timed loop.
    const t = clamp((Math.abs(distance) - half) / 1.45, 0, 1);
    const ease = smooth(t), side = Math.sign(distance);
    const deck=fanDeckPose(side,layout,frame,viewport);
    // Match the arc's incoming velocity, so the curl has no sharp corner.
    x = side * join(radius*Math.sin(turn),Math.abs(deck.x-frame.origin-viewport/2),radius*Math.cos(turn)*turn/half*1.45,t);
    y = join(y,deck.y,mobile?0:radius*Math.sin(turn)*turn/half*1.45,t);
    // Clear the supporting palm before descending into the lower pile.
    // The zero-slope lift preserves both endpoint positions and tangents.
    if(side<0)y-=height*.55*Math.sin(Math.PI*t)**2;
    rotation = side * join(Math.abs(rotation),0,turn*180/Math.PI/half*1.45,t);
    scale = 1 - (1-deck.scale) * ease;
    opacity = 1 - smooth(clamp((t - .9) / .1, 0, 1));
    flip=180*smooth(clamp((t-.12)/.72,0,1));
  }
  const spread=frame.spread??1;
  if(spread<1){
    const packet=Math.min(layout.slots,layout.count);
    const stackX=(index-(packet-1)/2)*2;
    const stackY=-index*1.8;
    x=stackX+(x-stackX)*spread;
    y=stackY+(y-stackY)*spread;
    rotation*=spread;scale=1+(scale-1)*spread;
    opacity=index<packet?1:opacity*spread;
    if(index<packet)flip*=spread;
  }
  return {
    x: frame.origin + viewport / 2 + x,
    y, rotation, scale, opacity,flip,
    order: Math.round((30-index)*(1-spread)+Math.max(1,30-Math.round(Math.abs(distance)*3))*spread),
  };
}
