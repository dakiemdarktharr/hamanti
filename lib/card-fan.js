const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = t => t * t * (3 - 2 * t);
const join = (from, to, slope, t) => (2*t*t*t-3*t*t+1)*from + (t*t*t-2*t*t+t)*slope + (-2*t*t*t+3*t*t)*to;

// One scroll coordinate drives the whole hand. Seeking backwards retraces the
// same poses, including the small incoming and outgoing piles at the edges.
export function fanFrame(layout, scroll, viewport) {
  const travel = Math.max(0, (layout.count - layout.slots) * layout.pitch);
  const progress = clamp(scroll - layout.sectionStart, 0, travel);
  return {
    origin: layout.sectionStart + progress - scroll,
    centre: layout.count <= layout.slots ? (layout.count - 1) / 2 : progress / layout.pitch + (layout.slots - 1) / 2,
  };
}

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
  const {cardWidth:width, cardHeight:height, slots, gutter} = layout;
  const distance = index - frame.centre;
  const mobile = slots < 2;
  const half = mobile ? 1 : (slots - 1) / 2;
  const turn = (mobile ? 12 : 33) * Math.PI / 180;
  const extent = Math.abs(distance) / half;
  const angle = clamp(distance / half, -1, 1) * turn;
  const projected = width * Math.cos(turn) + height * Math.sin(turn);
  const radius = Math.max(width * .6, (viewport - gutter * 2 - projected) / 2);
  let x = radius * Math.sin(angle) / Math.sin(turn);
  let y = mobile ? 0 : height * (.432 * Math.min(extent, 1) ** 2 - .19);
  let rotation = angle * 180 / Math.PI;
  let scale = 1, opacity = 1;

  if (extent > 1) {
    // Beyond the seven main cards: fold down from the incoming pile on the
    // right, then settle into the outgoing pile on the left. No timed loop.
    const t = clamp((Math.abs(distance) - half) / 1.45, 0, 1);
    const ease = smooth(t), side = Math.sign(distance);
    const deck=fanDeckPose(side,layout,frame,viewport);
    // Match the arc's incoming velocity, so the curl has no sharp corner.
    x = side * join(radius,Math.abs(deck.x-frame.origin-viewport/2),radius*turn/half/Math.tan(turn)*1.45,t);
    y = join(y,deck.y,mobile?0:height*.864/half*1.45,t);
    rotation = side * join(Math.abs(rotation),0,turn*180/Math.PI/half*1.45,t);
    scale = 1 - (1-deck.scale) * ease;
    opacity = 1 - smooth(clamp((t - .9) / .1, 0, 1));
  }
  return {
    x: frame.origin + viewport / 2 + x,
    y, rotation, scale, opacity,
    order: Math.max(1, 30 - Math.round(Math.abs(distance) * 3)),
  };
}
