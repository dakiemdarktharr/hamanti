// CSS's perspective/rotateY acts inside the card's outer 2D transform. The
// hand depth prepass must use this same projected surface, including a flip.
export function cardSurfacePoint(u,v,pose,layout){
  const angle=pose.rotation*Math.PI/180,flip=pose.flip*Math.PI/180;
  const denominator=1+Math.sin(flip)*u/1100;
  const x=u*Math.cos(flip)/denominator,y=v/denominator;
  return {x:pose.x+pose.scale*(x*Math.cos(angle)-y*Math.sin(angle)),
    y:layout.journeyHeight*.47+pose.y+pose.scale*(x*Math.sin(angle)+y*Math.cos(angle)),
    depth:-u*Math.sin(flip)*pose.scale/denominator};
}
