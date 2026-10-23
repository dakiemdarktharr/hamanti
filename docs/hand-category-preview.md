# Five-card scroll opening and hand motion

Hands run on the normal index at `/#/index`. Add `?preview=hands` before the
hash to show Play demo and the 0–540 frame scrubber for a nine-second
forward/reverse review. Review controls are absent from normal visits.

## Scroll sequence

The untouched index has five cards stacked at the center and no outgoing
deck. During the first 2.6 card pitches of scrolling, the hands rise from below
the viewport, grip the packet, and spread it into a compact radial fan.
Reversing scroll closes the fan and lowers the hands again. No independent
playback clock drives the live scroll interaction.

Five card positions share a lower pivot. Subsequent scrolling uses the
existing curl into the incoming/outgoing end decks and the original velocity
spring. The closer hands follow material contact points on the inner cards,
rather than following a departing card all the way into the distant pile.
A hand changes its contact card while its thumb is released.

The lower deck remains empty until the first card completes its deposit,
then shows one, two, three and four cards. Four is its visual maximum.
Incoming cards turn from their engraved hamanti backs to category faces;
departing cards turn back over before entering the lower deck. The links,
images, labels and category navigation remain the existing website content.

Card backs use a locally authored engraved pattern and the actual logo.
Both faces have paper grain, edge discoloration and small scuffs.

## Hands and occlusion

Only hand geometry and skeletal animation are imported from Blender.
Positive scales preserve left/right handedness. Both transparent passes render
the complete anatomical meshes. The front pass uses invisible depth surfaces
that match each existing HTML card, including its rounded corners, perspective
flip, rotation, scale and spring. Bone weights never cut the visible skin.

The fitted paper plane is at source-rig Y = 3.55, below the distal pad landmark.
Thumb contacts sit on the lower card margin. A departing card lifts clear of
the supporting left palm before turning down toward the lower deck, while
retaining its original deck destination and continuous endpoint velocity.

The browser audit evaluates all 541 review frames. It checks actual skinned
hand bounds, projected card surfaces, and visible thumb connectivity to each
sleeve after card occlusion. The pixel check includes rear-hand visibility
through translucent cards. A positive separating X interval alone cannot
detect a severed-looking thumb, so both kinds of checks are required.

## Full landscape preparation and loading

The shan shui worker prepares the entire range for all 300 categories before
the loader can finish. There is no early-entry button or overall timeout
that bypasses this requirement. All raster tiles are decoded before readiness;
scrolling and distant category jumps only attach already prepared canvases.
A 96 MiB pixel budget bounds the complete cache. Resizes map the new scroll
range onto the already cached landscape.

The loader starts with rough pencil contours, hatching, long straight
construction lines, graphite smears, erased strokes, fragments and eraser
crumbs. Real preparation progress inks a large serif nameplate. Draft marks
and guides disappear as it finishes. The completed title remains intact after
reveal; the previous automatic typewriter deletion has been removed.

## Navigation continuity

Stopping Lenis retains native horizontal scrolling and the current offset.
Cards, their spring and the skeletal frame stay frozen while the cover closes.
The route commits beneath the opaque cover, then the destination is revealed.
Native animation-frame traces and browser screencast frames check both logo
navigation during wheel momentum and selection of a held category card.
The removed home caption is absent from the markup.

Unit tests cover the reversible packet/fan, pile count and saturation,
flips, continuous curls, contacts, spring, asset isolation and terrain coverage.
Browser checks cover the loading gate, all 541 grip poses, distant cached-terrain
jumps, frame controls, search, empty results, detail return and mobile sizing.

Latest correction recordings and evidence: demos/correction-audit/.
