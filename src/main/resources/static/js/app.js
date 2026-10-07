"use strict";
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const initials = name => String(name || "?").split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("").toUpperCase();
const time = value => value ? new Date(value).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "—";
const date = value => value ? new Date(value).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
const rideDate = ride => ride.departureDate+"T"+ride.departureTime;
const future = ride => new Date(rideDate(ride)) > new Date() && ["available","full"].includes(ride.status);
const matchTitle = match => match ? match.homeTeam+" vs "+match.awayTeam : "Match details unavailable";
const dtValue = value => value ? String(value).slice(0,16) : "";
const seconds = value => value && value.length===16 ? value+":00" : value;
const pill = status => '<span class="pill '+esc(status)+'">'+esc(status)+'</span>';
const icons = {
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="m8 10 4-3 4 3-1 5H9zM12 3v4m-9 7 6 1m6 0 6-1m-9 7v-4"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  car:'<path d="m5 7 2-4h10l2 4M3 8h18v10H3zM5 18v3m14-3v3M3 12h18"/><path d="M6 15h2m8 0h2"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-15a3 3 0 0 1 0 6m3 9v-3a5 5 0 0 0-3-4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 5h3m4 0h3"/>',
  star:'<path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1z"/>',
  message:'<path d="M21 11a9 9 0 0 1-9 9 9 9 0 0 1-4-1l-5 2 2-5a9 9 0 1 1 16-5Z"/><path d="M8 8c1 4 3 6 7 7"/>',
  road:'<path d="m7 3-4 18m14-18 4 18M12 3v3m0 4v3m0 4v4"/>'
};
const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.arrow)+'</svg>';
const button = (label,action,id="",kind="secondary small",extra="") => '<button type="button" class="button '+kind+'" data-action="'+action+'" data-id="'+esc(id)+'" '+extra+'>'+label+'</button>';
const empty = (title,description,link="") => '<div class="empty">'+icon("ball")+'<h3>'+esc(title)+'</h3><p>'+esc(description)+'</p>'+link+'</div>';
const heading = (title,description,action="") => '<div class="heading"><div><h1>'+title+'</h1><p class="muted">'+description+'</p></div>'+action+'</div>';
const options = (rows,label,selected="") => rows.map(row=>'<option value="'+esc(row.id)+'" '+(String(row.id)===String(selected)?'selected':'')+'>'+esc(label(row))+'</option>').join("");
const state = {page:document.body.dataset.page,user:Session.get(),data:null,saved:[],recommended:[],adminTab:"overview",rideTab:"passenger",pageError:""};
let toastTimer;
function toast(message,error=false) {
  const box=$("#toast");box.textContent=message;box.className="show"+(error?" error":"");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.className="",6000);
}
function header() {
  const nav=[["home","index.html","Home"],["matches","matches.html","Matches"],["plan","plan.html","My plan"],["rides","rides.html","Find a ride"],["my-rides","my-rides.html","My rides"]];
  $("#header").innerHTML='<div class="topbar"><div class="container header-inner"><a class="brand" href="index.html"><img class="brand-logo" src="images/darbak-logo.png" alt="" width="76" height="64">Darbak <span lang="ar">دربك</span></a><nav class="nav" aria-label="Main navigation">'+nav.map(([key,path,label])=>'<a '+(state.page===key?'class="active" aria-current="page"':'')+' href="'+path+'">'+label+'</a>').join("")+'<a href="admin.html" '+(state.page==="admin"?'class="active" aria-current="page"':'')+'>Manage</a></nav><div class="account">'+(state.user?'<a href="profile.html" class="avatar" aria-label="Your profile">'+esc(initials(state.user.name))+'</a><a href="profile.html" class="name">'+esc(state.user.name)+'</a><button class="text-button" data-action="logout">Sign out</button>':'<a href="login.html" class="button secondary small">Sign in</a><a href="register.html" class="button small">Join Darbak</a>')+'</div></div></div>';
}
function modal(title,content) {
  const box=$("#modal");box.innerHTML='<div class="modal-head"><h2 id="modal-title">'+esc(title)+'</h2><button class="close" data-action="close" aria-label="Close dialog">×</button></div><div class="modal-body">'+content+'</div>';
  if(!box.open) box.showModal();
}
function modalError(message) {
  let box=$("#modal .modal-error");
  if(!box) {box=document.createElement("div");box.className="notice error modal-error";$("#modal .modal-body").prepend(box);}
  box.textContent=message;
}
function findRide(id) { return state.data.rides.find(ride=>ride.id===Number(id)); }
function signedOut() { return '<div class="signed-out">'+empty("Your matchday starts here","Sign in to save matches, arrange rides, and keep everything together.",'<a class="button" href="login.html">Sign in</a> <a class="button secondary" href="register.html">Create an account</a>')+'</div>'; }
function notificationStrip() { return '<div class="notification-strip">'+icon("message")+'<p><strong>Stay in the loop.</strong> WhatsApp updates are sent when a request is submitted, accepted, or rejected, and when a ride is cancelled or completed. A welcome email follows registration.</p></div>'; }
function teamBadge(team) {
  const code = teamFlagCode(team);
  if (!code) return '<span class="team-badge">'+esc(initials(team))+'</span>';
  return '<span class="team-badge flag-badge"><img class="team-flag" src="images/flags/'+code+'.svg" alt="'+esc(team)+' flag" width="56" height="42" loading="lazy" decoding="async"></span>';
}
function matchCard(match) {
  const saved=state.saved.some(row=>row.id===match.id);
  return '<article class="card match-card"><div class="card-top"><span class="match-date">'+esc(date(match.startTime))+' · '+esc(time(match.startTime))+'</span>'+pill(match.status)+'</div><div class="teams"><div class="team">'+teamBadge(match.homeTeam)+''+esc(match.homeTeam)+'</div><span class="versus">VS</span><div class="team">'+teamBadge(match.awayTeam)+''+esc(match.awayTeam)+'</div></div><div class="card-bottom"><div class="stadium-line">'+icon("pin")+esc(match.stadium?.name)+' · '+esc(match.stadium?.city)+'</div><div class="actions">'+button(saved?"Saved ✓":"Save match",saved?"remove-match":"save-match",match.id,saved?"secondary small":"small")+ '<a class="button secondary small" href="rides.html?match='+match.id+'">Find rides</a></div></div></article>';
}
function rideCard(ride) {
  const owned=state.user && ride.driverId===state.user.id;
  const title=ride.driver?.name || "Ride #"+ride.id;
  return '<article class="card ride-card"><div class="card-top"><div class="person"><span class="avatar">'+esc(initials(title))+'</span><div><strong>'+esc(title)+'</strong><div class="meta">'+(ride.car?esc(ride.car.carName)+" · "+esc(ride.car.color):owned?"Your offered ride":"Shared matchday ride")+'</div></div></div>'+pill(ride.status)+'</div><div class="route"><div class="route-stop"><span class="route-dot"></span><div><span class="meta">Meeting point</span><strong>'+esc(ride.meetingPoint)+'</strong></div></div><div class="route-stop"><span class="route-dot solid"></span><div><span class="meta">Destination</span><strong>'+esc(ride.destination)+'</strong></div></div></div><div class="ride-match">'+esc(matchTitle(ride.match))+'</div><div class="ride-footer"><div><b>'+esc(time(rideDate(ride)))+'</b><div class="meta">'+esc(date(rideDate(ride)))+' · '+ride.availableSeats+' seats left</div></div>'+button("View ride "+icon("arrow"),"ride-details",ride.id,"small")+'</div></article>';
}
function statCard(label,value,name) {return '<div class="card stat">'+icon(name)+'<div><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div></div>';}
function homeView() {
  const upcoming=state.data.matches.filter(match=>new Date(match.startTime)>new Date()&&match.status==="scheduled").sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const available=state.data.rides.filter(ride=>future(ride)&&ride.availableSeats>0);
  return '<div class="heading"><div><div class="eyebrow">YOUR MATCHDAY, MADE SIMPLE</div><h1 style="margin-top:9px;margin-bottom:7px">'+(state.user?'Good to see you, '+esc(state.user.name)+'.':'Welcome to Darbak.')+'</h1><p class="muted">Your next great match starts with the journey.</p></div><span class="pill">ASIAN CUP · SAUDI ARABIA</span></div><section class="hero"><div class="hero-content"><span class="tag">FOR FANS. BY FANS.</span><h1>Same match.<br>Shared journey.</h1><p>Find your fellow fans, share a ride to the stadium, and make more of every matchday.</p><div class="actions"><a class="button light" href="rides.html">Find a ride '+icon("arrow")+'</a><a class="button secondary" href="matches.html">Explore matches</a></div></div><img class="hero-image" src="images/hero.jpg" alt="AFC Asian Cup Saudi Arabia 2027 trophy and tournament artwork" width="1800" height="1200" fetchpriority="high"></section><div class="grid four stats">'+statCard("Upcoming matches",upcoming.length,"ball")+statCard("Available rides",available.length,"car")+statCard("Stadiums",state.data.stadiums.length,"pin")+statCard("Your saved matches",state.saved.length,"calendar")+'</div><section class="section"><div class="section-head"><h2>Pick your next match</h2><a class="text-button" href="matches.html">All matches '+icon("arrow")+'</a></div>'+(upcoming.length?'<div class="grid three">'+upcoming.slice(0,3).map(matchCard).join("")+'</div>':empty("The fixtures are on their way","Add your demo fixtures from the management page."))+'</section><section class="section grid two"><div class="card feature"><div class="feature-icon">'+icon("car")+'</div><div><h3>Room for a few more?</h3><p class="muted">Add your car and offer a ride to your next match.</p>'+button("Offer a ride "+icon("arrow"),"new-ride","","text-button")+'</div></div><div class="card feature"><div class="feature-icon">'+icon("calendar")+'</div><div><h3>A whole day of football</h3><p class="muted">Save your matches and arrange a ride for each one.</p><a class="text-button" href="plan.html">Build my plan '+icon("arrow")+'</a></div></div></section>'+notificationStrip();
}
function matchesView(rows=state.data.matches) {
  return heading("Find your next match","Pick a team, choose a stadium, and plan your day.")+'<form class="card filters" data-form="match-filter"><label>Team<input name="team" placeholder="e.g. Saudi Arabia"></label><label>Stadium<select name="stadium"><option value="">All stadiums</option>'+options(state.data.stadiums,row=>row.name)+'</select></label><label>City<select name="city"><option value="">All cities</option>'+[...new Set(state.data.stadiums.map(row=>row.city))].sort().map(city=>'<option>'+esc(city)+'</option>').join("")+'</select></label><label>Match date<input type="date" name="day"></label><button class="button">Find matches</button></form><div id="match-results">'+(rows.length?'<div class="grid three">'+[...rows].sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(matchCard).join("")+'</div>':empty("No matches yet","Try another filter or add fixtures in Manage."))+'</div>';
}
function scheduleRows(matches,withoutIds) {
  if(!matches.length) return empty("Your plan is waiting","Save a match and we will keep your matchday here.",'<a class="button" href="matches.html">Browse matches</a>');
  return '<div class="timeline">'+matches.map(match=>'<article class="schedule-row"><div class="card"><div class="actions"><span class="time">'+esc(time(match.startTime))+'</span><div><h3>'+esc(matchTitle(match))+'</h3><div class="meta">'+esc(date(match.startTime))+' · '+esc(match.stadium?.name)+'</div><div class="spacer"></div>'+pill(withoutIds.has(match.id)?"ride needed":match.status)+'</div></div><div class="actions"><a href="rides.html?match='+match.id+'" class="button small">Find rides</a>'+button("Remove","remove-match",match.id,"secondary small")+'</div></div></article>').join("")+'</div>';
}
async function planView() {
  const without=await Api.list("/user/"+state.user.id+"/matches/without-rides");
  const rows=[...state.saved].sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const withoutIds=new Set(without.map(row=>row.id));
  const pairs=[];
  for(let i=1;i<rows.length;i++) if(rows[i-1].startTime.slice(0,10)===rows[i].startTime.slice(0,10)) pairs.push([rows[i-1],rows[i]]);
  return heading("Your matchday plan","All your saved matches, in kickoff order.",'<div class="actions">'+button("Email my plan","email-plan","","secondary small",'title="Email your upcoming ride schedule as a PDF"')+button("AI matchday plan","ai-plan","","small")+'</div>')+'<form class="card filters" data-form="plan-filter"><label>Show a specific day<input name="day" type="date"></label><button class="button secondary">Show schedule</button><span class="meta">'+without.length+' upcoming matches need a ride</span></form>'+pairs.map(([a,b])=>'<div class="notice '+(new Date(a.expectedEndTime)>new Date(b.startTime)?"warning":"")+'"><div class="actions"><span><strong>Two matches, one day.</strong> '+esc(matchTitle(a))+' and '+esc(matchTitle(b))+'.</span>'+button("Check feasibility","feasibility","","secondary small",'data-first="'+a.id+'" data-second="'+b.id+'"')+'</div></div>').join("")+'<div id="schedule-results">'+scheduleRows(rows,withoutIds)+'</div><section class="section"><div class="section-head"><h2>Rides for your saved matches</h2><a href="rides.html?recommended=1" class="text-button">See recommendations '+icon("arrow")+'</a></div><p class="muted">Suggestions use available seats, departure times, and your saved matches.</p></section>';
}
function ridesView() {
  const selected=new URLSearchParams(location.search).get("match");
  return heading("Find your matchday crew","A seat, a shared journey, and fans heading your way.",button("Offer a ride","new-ride","","small"))+'<form class="card filters" data-form="ride-filter"><label>Match<select name="match"><option value="">All matches</option>'+options(state.data.matches,matchTitle,selected)+'</select></label><label>Departure date<input type="date" name="day"></label><label>Seats needed<input name="seats" type="number" value="1" min="1" max="20"></label><button class="button">Find rides</button>'+(state.user?button("For my matches","recommended","","secondary"):"")+'</form><div id="ride-results" class="grid three"></div>'+notificationStrip();
}
function requestTable(requests,driverMode=false) {
  return '<div class="table-wrap"><table><thead><tr><th>'+(driverMode?"Passenger":"Ride")+'</th><th>Status</th><th>Requested</th><th class="right">Action</th></tr></thead><tbody>'+requests.map(request=>'<tr><td>'+(driverMode?'<strong>'+esc(request.passenger?.name||"Passenger details unavailable")+'</strong>':'<strong>'+esc(matchTitle(request.ride?.match))+'</strong><div class="meta">'+esc(request.ride?.meetingPoint)+'</div>')+'</td><td>'+pill(request.status)+'</td><td>'+esc(date(request.requestedAt))+'</td><td><div class="actions">'+(driverMode&&request.status==="pending"?button("Accept","accept-request",request.id,"small")+button("Reject","reject-request",request.id):!driverMode&&request.status==="pending"?button("Cancel request","cancel-request",request.id):button("View ride","ride-details",request.rideId))+'</div></td></tr>').join("")+'</tbody></table></div>';
}
function myRidesView() {
  const mine=state.data.requests.filter(request=>request.passengerId===state.user.id);
  const driverRides=state.data.rides.filter(ride=>ride.driverId===state.user.id);
  const passengerRideIds=new Set(mine.filter(request=>request.status==="accepted").map(request=>request.rideId));
  const passengerRides=state.data.rides.filter(ride=>passengerRideIds.has(ride.id));
  return heading("Your rides","From the first request to the final whistle.",button("Offer a ride","new-ride","","small"))+'<div class="tabs"><button data-action="ride-tab" data-id="passenger" class="'+(state.rideTab==="passenger"?"active":"")+'">As a passenger</button><button data-action="ride-tab" data-id="driver" class="'+(state.rideTab==="driver"?"active":"")+'">As a driver</button></div>'+(state.rideTab==="driver"?(driverRides.length?'<div class="grid three">'+driverRides.map(rideCard).join("")+'</div>':empty("Your first shared ride starts here","Add your car and offer a ride to a match.",button("Offer a ride","new-ride","","small"))):(passengerRides.length?'<div class="grid three">'+passengerRides.map(rideCard).join("")+'</div>':empty("No arranged rides yet","Find a ride and send a seat request.",'<a class="button" href="rides.html">Find a ride</a>')))+'<section class="section"><div class="section-head"><h2>'+(state.rideTab==="driver"?"Requests for your rides":"Your seat requests")+'</h2></div><div class="card">'+(state.rideTab==="driver"?state.data.requests.some(request=>driverRides.some(ride=>ride.id===request.rideId))?requestTable(state.data.requests.filter(request=>driverRides.some(ride=>ride.id===request.rideId)),true):'<p class="muted">No seat requests yet.</p>':mine.length?requestTable(mine):'<p class="muted">You have not sent a request yet.</p>')+'</div></section>'+notificationStrip();
}
async function profileView() {
  const [user,rides,matches,rating,reviews]=await Promise.all([Api.request("/user/get/"+state.user.id),Api.request("/user/ride-statistics/"+state.user.id),Api.request("/user/match-statistics/"+state.user.id),Api.request("/user/average-rating/"+state.user.id),Api.list("/review/get")]);
  const safe=Api.safeUser(user);Session.set(safe);state.user=Session.get();header();
  const myCars=state.data.cars.filter(car=>BrowserLinks.get().cars[car.id]===state.user.id);
  const written=reviews.filter(review=>review.reviewer?.id===state.user.id);
  const received=reviews.filter(review=>review.reviewedUser?.id===state.user.id);
  return heading("Your profile","Your cars, your matchdays, your community.",button("Edit profile","edit-profile","","secondary"))+'<div class="card profile-top"><span class="avatar">'+esc(initials(user.name))+'</span><div><h2>'+esc(user.name)+'</h2><div class="meta">'+esc(user.email)+' · '+esc(user.phoneNumber)+'</div><span class="rating">★ '+Number(rating).toFixed(1)+' / 5</span></div></div><div class="grid four stats">'+statCard("Rides offered",rides.totalRidesAsDriver,"car")+statCard("Rides joined",rides.totalRidesAsPassenger,"people")+statCard("Matches through rides",matches.totalMatches,"ball")+statCard("Completed as passenger",rides.completedRidesAsPassenger,"calendar")+'</div><section class="section"><div class="section-head"><h2>My cars</h2>'+button("Add a car","new-car","","small")+'</div>'+(myCars.length?'<div class="grid three">'+myCars.map(car=>'<div class="card"><div class="card-top"><h3>'+esc(car.carName)+'</h3>'+icon("car")+'</div><p class="muted">'+esc(car.color)+' · '+esc(car.plateNumber)+' · '+car.seatsCount+' total seats</p><div class="actions">'+button("Edit","edit-car",car.id)+button("Check availability","car-availability",car.id)+button("Delete","delete-car",car.id,"danger small")+'</div></div>').join("")+'</div>':empty("Add your matchday car","Cars added here appear in My cars. Existing cars can be selected when offering a ride."))+'<p class="hint">Cars added or used successfully in this browser appear here. Choose your own car when offering a ride.</p></section><section class="section"><div class="section-head"><h2>Your reviews</h2>'+button("AI review summary","ai-summary",state.user.id,"secondary small")+'</div><div class="grid two"><div class="card"><h3>What fans say about you</h3>'+reviewRows(received,false)+'</div><div class="card"><h3>Reviews you have written</h3>'+reviewRows(written,true)+'</div></div></section>';
}
function reviewRows(rows,editable) {
  if(!rows.length) return '<p class="muted">No reviews yet. Reviews open after a ride is completed.</p>';
  return rows.map(review=>'<article class="review-row"><div class="card-top"><strong>'+esc(editable?review.reviewedUser?.name:review.reviewer?.name)+'</strong><span class="rating">★ '+review.rating+' / 5</span></div><p class="review-text">'+esc(review.comment||"Rating only")+'</p><div class="card-top"><span class="meta">'+esc(date(review.createdAt))+' · Ride #'+review.ride?.id+'</span>'+(editable?'<div class="actions">'+button("Edit","edit-review",review.id)+button("Delete","delete-review",review.id,"danger small")+'</div>':"")+'</div></article>').join("");
}
async function render() {
  header();
  if(state.page==="login"||state.page==="register") {$("#main").innerHTML=authView(state.page==="register");return;}
  if(["plan","my-rides","profile"].includes(state.page)&&!state.user) {$("#main").innerHTML=signedOut();return;}
  $("#main").innerHTML='<div class="loading" role="status">Getting your matchday ready…</div>';
  try {
    state.data=await Api.catalog();
    state.saved=state.user?await Api.list("/user/"+state.user.id+"/matches"):[];
    const views={home:homeView,matches:matchesView,plan:planView,rides:ridesView,"my-rides":myRidesView,profile:profileView,admin:adminView};
    $("#main").innerHTML=(state.data.warnings.length?'<div class="notice warning">'+state.data.warnings.map(esc).join(" ")+'</div>':"")+await views[state.page]();
    if(state.page==="rides") {
      const query=new URLSearchParams(location.search);
      if(query.get("recommended")&&state.user) await recommendedRides();
      else await filterRides(Object.fromEntries(new FormData($('[data-form="ride-filter"]'))));
    }
  } catch(error) {
    $("#main").innerHTML=heading("Let's try that again","Your matchday data could not be loaded.")+'<div class="notice error">'+esc(error.message)+'</div>'+button("Retry","refresh","","small");
  }
}

function authView(register) {
  return '<div class="auth"><div class="auth-art"><div class="eyebrow" style="color:var(--lime)">ONE MATCH. ONE COMMUNITY.</div><h2>Share the journey.<br>Feel the game.</h2><p>Meet fans heading to the same match. Turn the ride to the stadium into part of the experience.</p></div><div class="auth-form"><img class="auth-logo" src="images/darbak-logo.png" alt="Darbak logo" width="160" height="135"><h1>'+(register?"Join the matchday crew.":"Welcome back, fan.")+'</h1><p class="muted">'+(register?"Create an account and plan your next match.":"Sign in to find your next shared journey.")+'</p><form data-form="'+(register?"register":"login")+'">'+(register?'<label>Your name<input name="name" minlength="2" maxlength="15" autocomplete="name" required></label>':"")+'<label>Email address<input name="email" type="email" maxlength="40" autocomplete="email" required></label><label>Password<input name="password" type="password" minlength="6" maxlength="100" autocomplete="'+(register?"new-password":"current-password")+'" required></label>'+(register?'<label>Saudi mobile number<input name="phoneNumber" type="tel" placeholder="05XXXXXXXX" pattern="05[0-9]{8}" maxlength="10" autocomplete="tel" required></label><p class="hint">Ride updates are sent to this number through WhatsApp.</p>':"")+'<div class="modal-error" role="alert"></div><button class="button">'+(register?"Create account":"Sign in")+' '+icon("arrow")+'</button></form><p class="aside">'+(register?'Already have an account? <a href="login.html">Sign in</a>':'New here? <a href="register.html">Create an account</a>')+'</p></div></div>';
}
const fields = {
  stadium:[
    {name:"name",label:"Stadium name",minlength:2,maxlength:50},{name:"city",label:"City",minlength:2,maxlength:50},
    {name:"address",label:"Address",maxlength:100},{name:"latitude",label:"Latitude",type:"number",min:-90,max:90,step:"any"},
    {name:"longitude",label:"Longitude",type:"number",min:-180,max:180,step:"any"}
  ],
  match:[
    {name:"stadium",label:"Stadium",type:"select",rows:()=>state.data.stadiums,labelRow:row=>row.name},
    {name:"homeTeam",label:"Home team",maxlength:100},{name:"awayTeam",label:"Away team",maxlength:100},
    {name:"startTime",label:"Kickoff",type:"datetime-local"},{name:"expectedEndTime",label:"Expected end",type:"datetime-local"},
    {name:"status",label:"Status",type:"select",values:["scheduled","live","completed","postponed","cancelled"]}
  ],
  car:[
    {name:"carName",label:"Car name",minlength:2,maxlength:15},{name:"plateNumber",label:"Plate number",minlength:4,maxlength:4},
    {name:"seatsCount",label:"Total seats, including driver",type:"number",min:1,max:20},{name:"color",label:"Color",minlength:2,maxlength:10}
  ],
  user:[
    {name:"name",label:"Name",minlength:2,maxlength:15},{name:"email",label:"Email",type:"email",maxlength:40},
    {name:"phoneNumber",label:"Saudi mobile number",type:"tel",pattern:"05[0-9]{8}",maxlength:10},
    {name:"password",label:"Password (required to save)",type:"password",minlength:6,maxlength:100}
  ],
  admin:[
    {name:"name",label:"Name (English letters)",minlength:4,maxlength:20,pattern:"[A-Za-z ]+"},
    {name:"email",label:"Email",type:"email",maxlength:50},
    {name:"phone",label:"Mobile number (+9665XXXXXXXX)",type:"tel",pattern:"\\+9665[0-9]{8}"},
    {name:"password",label:"Password (letters and numbers)",type:"password",minlength:8,maxlength:255,pattern:"(?=.*[A-Za-z])(?=.*[0-9]).+"}
  ]
};
function fieldHtml(field,row={}) {
  let value=row[field.name] ?? "";
  if(field.type==="password") value="";
  if(field.type==="datetime-local") value=dtValue(value);
  if(field.name==="stadium") value=row.stadium?.id ?? value;
  let control;
  if(field.type==="select") control='<select name="'+field.name+'" required>'+(field.values?field.values.map(option=>'<option '+(option===value?"selected":"")+'>'+option+'</option>').join(""):'<option value="">Choose '+field.label.toLowerCase()+'</option>'+options(field.rows(),field.labelRow,value))+'</select>';
  else control='<input name="'+field.name+'" type="'+(field.type||"text")+'" value="'+esc(value)+'" '+["min","max","step","minlength","maxlength","pattern"].filter(key=>field[key]!==undefined).map(key=>key+'="'+esc(field[key])+'"').join(" ")+' '+(field.type==="password"?'autocomplete="new-password"':"")+' required>';
  return '<label>'+esc(field.label)+control+'</label>';
}
function entityForm(kind,row={},id="") {
  modal((id?"Edit ":"Add ")+(kind==="user"?"profile":kind),'<form class="form-grid" data-form="entity" data-kind="'+kind+'" data-id="'+esc(id)+'">'+fields[kind].map(field=>fieldHtml(field,row)).join("")+'<div class="modal-error" role="alert"></div><div class="modal-footer"><button class="button secondary" type="button" data-action="close">Cancel</button><button class="button">Save '+(kind==="user"?"profile":kind)+'</button></div></form>');
}
function rideForm(ride) {
  if(!state.user) {location.href="login.html";return;}
  if(!state.data.cars.length) {modal("Add your car first",'<p class="muted">Add a car before offering your first ride.</p>'+button("Add a car","new-car","","small"));return;}
  const links=BrowserLinks.get();
  const cars=state.data.cars.filter(car=>!links.cars[car.id]||links.cars[car.id]===state.user.id||car.id===ride?.carId);
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const localDate=new Date(tomorrow.getTime()-tomorrow.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const row=ride||{departureDate:localDate,departureTime:"15:00",availableSeats:1,meetingLatitude:24.7136,meetingLongitude:46.6753};
  modal(ride?"Edit your ride":"Offer a matchday ride",'<form class="form-grid" data-form="ride" data-id="'+(ride?.id||"")+'"><label>Match<select name="matchId" required '+(ride?"disabled":"")+'><option value="">Choose a match</option>'+options(state.data.matches,matchTitle,ride?.matchId)+'</select></label><label>Car<select name="carId" required '+(ride?"disabled":"")+'><option value="">Choose your car</option>'+options(cars,car=>car.carName+" · "+car.plateNumber+(links.cars[car.id]===state.user.id?" · My car":""),ride?.carId)+'</select>'+(ride&&!ride.carId?'<span class="hint">The car stays unchanged on this ride.</span>':"")+'</label><label>Departure date<input name="departureDate" type="date" value="'+esc(row.departureDate)+'" required></label><label>Departure time<input name="departureTime" type="time" value="'+esc(String(row.departureTime).slice(0,5))+'" required></label><label>Expected arrival<input name="expectedArrivalTime" type="datetime-local" value="'+dtValue(row.expectedArrivalTime)+'" required></label><label>Seats available<input name="availableSeats" type="number" min="'+(ride?0:1)+'" max="20" value="'+row.availableSeats+'" required></label><label class="full">Meeting point name<input name="meetingPoint" minlength="5" maxlength="255" value="'+esc(row.meetingPoint)+'" placeholder="e.g. Olaya public parking" required></label><label>Latitude<input name="meetingLatitude" type="number" step="any" min="-90" max="90" value="'+esc(row.meetingLatitude)+'" required></label><label>Longitude<input name="meetingLongitude" type="number" step="any" min="-180" max="180" value="'+esc(row.meetingLongitude)+'" required></label><div class="full"><div class="map-controls">'+button("Use device location","device-location","","secondary small",'type="button"')+button("Select on Google Maps","pick-map","","secondary small",'type="button"')+'</div><details><summary class="hint">Google Maps browser key</summary><input type="password" name="mapsKey" value="'+esc(localStorage.getItem("darbak.mapsKey")||"")+'" placeholder="Your restricted browser key" autocomplete="off"><p class="hint">Only needed for the interactive map. Device location and typed coordinates work without it.</p></details><div id="pick-map" class="map" hidden><p>Click the map to choose your meeting point.</p></div><div class="location-note" id="location-note" role="status"></div></div><label class="full">Destination<input name="destination" minlength="5" maxlength="255" value="'+esc(row.destination)+'" placeholder="Stadium name" required></label><label class="full">Notes<textarea name="notes" minlength="3" maxlength="500" placeholder="Anything your fellow fans should know?" required>'+esc(row.notes)+'</textarea></label><p class="hint full">Departure and expected arrival must be before kickoff. Choose your own car for the ride.</p><div class="modal-error" role="alert"></div><div class="modal-footer">'+button("Check car availability","ride-availability","","secondary",'type="button"')+'<button class="button">'+(ride?"Save changes":"Publish ride")+'</button></div></form>');
}
async function rideDetails(id) {
  const ride=findRide(id);
  if(!ride) throw new Error("This ride is no longer available. Refresh the page.");
  modal("Your matchday ride",'<div class="loading">Loading ride details…</div>');
  const passengers=await Api.passengers(ride.id,state.data.users);
  const owns=state.user?.id===ride.driverId;
  const joined=passengers.find(row=>row.userId===state.user?.id);
  const request=state.data.requests.find(row=>row.rideId===ride.id&&row.passengerId===state.user?.id&&["pending","accepted"].includes(row.status));
  const map=ride.map;
  const directions=map?'<div class="map-controls"><a class="button secondary small" target="_blank" rel="noopener" href="'+esc(map.meetingDirectionsUrl)+'">To meeting point ↗</a><a class="button secondary small" target="_blank" rel="noopener" href="'+esc(map.rideDirectionsUrl)+'">To stadium ↗</a>'+button("Show Google map","view-map",ride.id)+'</div><div id="view-map" class="map" hidden></div>':'<p class="muted">Map details are unavailable for this ride.</p>';
  const requestRows=state.data.requests.filter(row=>row.rideId===ride.id);
  const reviews=ride.status==="completed"?await Api.list("/review/get"):[];
  const targets=owns?passengers.filter(row=>row.role==="passenger"&&row.userId).map(row=>row.user):joined&&ride.driver?[ride.driver]:[];
  const reviewAction=targets.length?button("Write a review","new-review",ride.id,"small"):"";
  state.detailPassengers=passengers;state.detailReviewTargets=targets;state.reviews=reviews;
  const controls=owns?(future(ride)?button("Edit ride","edit-ride",ride.id)+button("Cancel ride","cancel-ride",ride.id,"danger small"):"")+(["available","full"].includes(ride.status)&&new Date(rideDate(ride))<=new Date()?button("Complete ride","complete-ride",ride.id,"small"):"")+button("Delete ride","delete-ride",ride.id,"danger small"):joined&&joined.role==="passenger"&&future(ride)?button("Leave ride","remove-participant",joined.id,"danger small"):request?pill(request.status):future(ride)&&ride.availableSeats>0?button("Request a seat","join-ride",ride.id,"small"):"";
  $("#modal .modal-body").innerHTML='<div class="card-top"><div><div class="eyebrow">RIDE #'+ride.id+'</div><h2 style="margin-top:9px">'+esc(matchTitle(ride.match))+'</h2><p class="muted">'+esc(ride.driver?.name||"Driver details unavailable")+' · '+esc(date(rideDate(ride)))+'</p></div>'+pill(ride.status)+'</div><div class="details-grid"><div class="detail-list"><div><span>Meeting point</span><strong>'+esc(ride.meetingPoint)+'</strong></div><div><span>Destination</span><strong>'+esc(ride.destination)+'</strong></div><div><span>Ride notes</span><strong>'+esc(ride.notes)+'</strong></div></div><div class="detail-list"><div><span>Departure</span><strong>'+esc(time(rideDate(ride)))+'</strong></div><div><span>Expected arrival</span><strong>'+esc(time(ride.expectedArrivalTime))+'</strong></div><div><span>Seats remaining</span><strong>'+ride.availableSeats+'</strong></div></div></div><section class="section">'+directions+'</section><section class="section"><div class="actions">'+controls+(ride.status==="completed"?reviewAction:"")+'</div></section><section class="section"><div class="section-head"><h2>Your matchday crew</h2><span class="meta">'+passengers.filter(row=>row.role==="passenger").length+' passengers</span></div>'+(passengers.length?'<div class="stack">'+passengers.map(row=>'<div class="card-top"><div class="row-person"><span class="avatar">'+esc(initials(row.user?.name))+'</span><div><strong>'+esc(row.user?.name||"Participant #"+row.id)+'</strong><div class="meta">'+esc(row.role)+'</div></div></div>'+(owns&&row.role==="passenger"&&future(ride)?button("Remove","remove-participant",row.id,"danger small"):"")+'</div>').join("")+'</div>':'<p class="muted">No passengers yet.</p>')+'</section>'+(owns?'<section class="section"><div class="section-head"><h2>Seat requests</h2></div>'+(requestRows.length?requestTable(requestRows,true):'<p class="muted">No requests yet. New requests will arrive here.</p>')+'</section>':"")+'<p class="hint section">WhatsApp notifications follow request decisions and ride status changes.</p>';
}
function reviewForm(rideId,review) {
  const targetRows=state.detailReviewTargets||[];
  if(!review&&!targetRows.length) throw new Error("Reviews are available only between a ride driver and their passengers.");
  modal(review?"Edit your review":"How was the shared journey?",'<form class="form-grid" data-form="review" data-id="'+(review?.id||"")+'" data-ride="'+esc(rideId)+'">'+(!review?'<label class="full">Reviewing<select name="reviewedUserId" required>'+options(targetRows,row=>row.name)+'</select></label>':"")+'<label class="full">Rating<select name="rating">'+[5,4,3,2,1].map(value=>'<option value="'+value+'" '+(value===review?.rating?"selected":"")+'>'+value+' / 5'+(value===5?" — Excellent":"")+'</option>').join("")+'</select></label><label class="full">Comment (optional)<textarea name="comment" maxlength="200" placeholder="Share your experience with other fans.">'+esc(review?.comment)+'</textarea></label><p class="hint full">Written comments are checked by AI before saving. You can also leave a rating without a comment.</p><div class="modal-error" role="alert"></div><div class="modal-footer"><button type="button" data-action="close" class="button secondary">Cancel</button><button class="button">Save review</button></div></form>');
}
async function filterMatches(values) {
  let rows;
  if(values.team.trim()) rows=await Api.list("/match/team/"+encodeURIComponent(values.team.trim()));
  else if(values.stadium) rows=await Api.list("/match/stadium/"+values.stadium);
  else if(values.city) rows=await Api.list("/match/city/"+encodeURIComponent(values.city));
  else rows=state.data.matches;
  rows=rows.filter(match=>(!values.stadium||match.stadium?.id===Number(values.stadium))&&(!values.city||match.stadium?.city===values.city)&&(!values.day||match.startTime.slice(0,10)===values.day));
  $("#match-results").innerHTML=rows.length?'<div class="grid three">'+[...rows].sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(matchCard).join("")+'</div>':empty("No matches found","Try another team, city, or date.");
}
async function filterRides(values) {
  let rows;
  if(values.match&&values.day) rows=await Api.list("/Ride/search/"+values.match+"/"+values.day+"/"+Number(values.seats||1));
  else if(values.match) rows=await Api.list("/Ride/match/"+values.match);
  else rows=await Api.list("/Ride/available");
  const ids=new Set(rows.filter(ride=>future(ride)&&ride.availableSeats>=Number(values.seats||1)&&(!values.day||ride.departureDate===values.day)).map(ride=>ride.id));
  const hydrated=state.data.rides.filter(ride=>ids.has(ride.id));
  $("#ride-results").className=hydrated.length?"grid three":"";
  $("#ride-results").innerHTML=hydrated.length?hydrated.map(rideCard).join(""):empty("No rides found","Try another date, or offer a ride for fellow fans.");
}
async function recommendedRides() {
  if(!state.user) {location.href="login.html";return;}
  const rows=await Api.list("/Ride/recommendations/user/"+state.user.id);
  const ids=new Set(rows.map(row=>row.rideId));const rides=state.data.rides.filter(ride=>ids.has(ride.id));
  $("#ride-results").className="";
  $("#ride-results").innerHTML='<div class="notice">Rides matched to your saved fixtures, available seats, and arrival before kickoff.</div>'+(rides.length?'<div class="grid three">'+rides.map(rideCard).join("")+'</div>':empty("No recommendations yet","Save upcoming matches or offer your own ride."));
}

async function adminView() {
  const tabs=[["overview","Overview"],["stadiums","Stadiums"],["matches","Matches"],["users","Users"],["reviews","Reviews"],["rides","Rides & requests"],["cars","Cars"],["admins","Admins"]];
  return heading("Manage Darbak","Keep the fixtures, rides, and community ready for matchday.")+'<div class="tabs">'+tabs.map(([key,label])=>'<button data-action="admin-tab" data-id="'+key+'" class="'+(state.adminTab===key?"active":"")+'">'+label+'</button>').join("")+'</div><div id="admin-content">'+await adminContent()+'</div>';
}
function table(headers,rows) {
  return '<div class="card table-wrap"><table><thead><tr>'+headers.map(header=>'<th>'+header+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table>'+(rows.length?"":'<p class="muted">No records yet.</p>')+'</div>';
}
async function adminContent() {
  const d=state.data;
  if(state.adminTab==="overview") return '<div class="grid four">'+statCard("Registered fans",d.users.length,"people")+statCard("Matches",d.matches.length,"ball")+statCard("Rides offered",d.rides.length,"car")+statCard("Stadiums",d.stadiums.length,"pin")+'</div><section class="section grid two"><div class="card"><h3>Start with the fixtures</h3><p class="muted">Add stadiums and matches, or import your configured football fixtures.</p>'+button("Manage matches","admin-tab","matches","small")+'</div><div class="card"><h3>Keep the community moving</h3><p class="muted">Review seat requests, moderate reviews, and manage users.</p>'+button("Manage users","admin-tab","users","secondary small")+'</div></section>'+notificationStrip();
  if(state.adminTab==="stadiums") return '<div class="section-head"><h2>Stadiums</h2><div class="actions">'+button("Bulk add","bulk-stadiums")+button("Add stadium","new-entity","stadium","small")+'</div></div>'+table(["Stadium","City","Coordinates","Actions"],d.stadiums.map(row=>'<tr><td><strong>'+esc(row.name)+'</strong><div class="meta">'+esc(row.address)+'</div></td><td>'+esc(row.city)+'</td><td class="meta">'+esc(row.latitude)+', '+esc(row.longitude)+'</td><td><div class="actions">'+button("Edit","edit-entity",row.id,"secondary small",'data-kind="stadium"')+button("Delete","delete-entity",row.id,"danger small",'data-kind="stadium"')+'</div></td></tr>'));
  if(state.adminTab==="matches") return '<div class="section-head"><h2>Match fixtures</h2><div class="actions">'+button("Import football fixtures","import-matches")+button("Add match","new-entity","match","small")+'</div></div>'+table(["Match","Kickoff","Stadium","Status","Actions"],d.matches.map(row=>'<tr><td><strong>'+esc(matchTitle(row))+'</strong></td><td>'+esc(date(row.startTime))+'<div class="meta">'+esc(time(row.startTime))+'</div></td><td>'+esc(row.stadium?.name)+'</td><td>'+pill(row.status)+'</td><td><div class="actions">'+button("Edit","edit-entity",row.id,"secondary small",'data-kind="match"')+button("Delete","delete-entity",row.id,"danger small",'data-kind="match"')+'</div></td></tr>'));
  if(state.adminTab==="users") return '<form class="card filters" data-form="user-filter"><label>Search by name<input name="name" placeholder="Fan name"></label><label>Rating<select name="rating"><option value="">All fans</option><option value="above">Above community average</option><option value="below">Below community average</option></select></label><button class="button secondary">Find fans</button></form><div id="user-results">'+userTable(d.users)+'</div>';
  if(state.adminTab==="reviews") {
    const reviews=await Api.list("/review/get");state.reviews=reviews;
    return '<div class="section-head"><h2>Community reviews</h2><span class="meta">'+reviews.length+' reviews</span></div>'+table(["Reviewer","Reviewed fan","Rating & comment","Actions"],reviews.map(row=>'<tr><td>'+esc(row.reviewer?.name)+'<div class="meta">Ride #'+row.ride?.id+'</div></td><td>'+esc(row.reviewedUser?.name)+'</td><td><span class="rating">★ '+row.rating+'</span><div class="meta review-text">'+esc(row.comment||"Rating only")+'</div></td><td>'+button("Delete","delete-review",row.id,"danger small")+'</td></tr>'));
  }
  if(state.adminTab==="cars") return '<div class="section-head"><h2>Registered cars</h2><span class="meta">Car ownership is validated when offering a ride</span></div>'+table(["Car","Plate","Seats","Actions"],d.cars.map(row=>'<tr><td>'+esc(row.carName)+'<div class="meta">'+esc(row.color)+'</div></td><td>'+esc(row.plateNumber)+'</td><td>'+row.seatsCount+'</td><td><div class="actions">'+button("Edit","edit-car",row.id)+button("Availability","car-availability",row.id)+button("Delete","delete-car",row.id,"danger small")+'</div></td></tr>'));
  if(state.adminTab==="admins") {
    const admins=(await Api.list("/admin/get")).map(row=>({id:row.id,name:row.name,email:row.email,phone:row.phone}));
    state.admins=admins;
    return '<div class="section-head"><h2>Admin accounts</h2>'+button("Add admin","new-entity","admin","small")+'</div>'+table(["Name","Email","Phone","Actions"],admins.map(row=>'<tr><td>'+esc(row.name)+'</td><td>'+esc(row.email)+'</td><td>'+esc(row.phone)+'</td><td><div class="actions">'+button("Edit","edit-entity",row.id,"secondary small",'data-kind="admin"')+button("Delete","delete-entity",row.id,"danger small",'data-kind="admin"')+'</div></td></tr>'));
  }
  if(state.adminTab==="rides") return '<div class="section-head"><h2>Rides and bookings</h2></div>'+table(["Ride","Driver","Seats","Status","Actions"],d.rides.map(row=>'<tr><td><strong>'+esc(matchTitle(row.match))+'</strong><div class="meta">'+esc(row.meetingPoint)+' · '+esc(date(rideDate(row)))+'</div></td><td>'+esc(row.driver?.name||"Unavailable")+'</td><td>'+row.availableSeats+'</td><td>'+pill(row.status)+'</td><td><div class="actions">'+button("Details","ride-details",row.id)+button("Bookings","manage-bookings",row.id)+'</div></td></tr>'));
  return "";
}
function userTable(users) {
  return table(["Fan","Email & phone","Status","Actions"],users.map(user=>'<tr><td><div class="row-person"><span class="avatar">'+esc(initials(user.name))+'</span><strong>'+esc(user.name)+'</strong></div></td><td>'+esc(user.email)+'<div class="meta">'+esc(user.phoneNumber)+'</div></td><td>'+pill(user.banned?"banned":"active")+'</td><td><div class="actions">'+button("Stats","fan-stats",user.id)+button("Edit","edit-entity",user.id,"secondary small",'data-kind="user"')+(!user.banned?button("Ban","ban-user",user.id,"danger small"):"")+button("Delete","delete-entity",user.id,"danger small",'data-kind="user"')+'</div></td></tr>'));
}
async function manageBookings(id) {
  const ride=findRide(id);if(!ride) throw new Error("Ride not found.");
  modal("Manage ride #"+ride.id,'<div class="loading">Loading bookings…</div>');
  const passengers=await Api.passengers(ride.id,state.data.users);state.detailPassengers=passengers;
  const requests=state.data.requests.filter(row=>row.rideId===ride.id);
  $("#modal .modal-body").innerHTML='<div class="section-head"><h2>Participants</h2>'+button("Add participant","add-participant",ride.id,"small")+'</div>'+table(["Fan","Role","Actions"],passengers.map(row=>'<tr><td>'+esc(row.user?.name||"Participant #"+row.id)+'</td><td>'+esc(row.role)+'</td><td>'+button("Remove","remove-participant",row.id,"danger small")+'</td></tr>'))+'<section class="section"><h2>Requests</h2>'+table(["Passenger","Status","Actions"],requests.map(row=>'<tr><td>'+esc(row.passenger?.name||"Unavailable")+'</td><td>'+pill(row.status)+'</td><td><div class="actions">'+(row.status==="pending"?button("Update status","request-status",row.id):"")+button("Delete","delete-request",row.id,"danger small")+'</div></td></tr>'))+'</section><p class="hint section">Passenger additions reserve a seat. Removing a passenger or accepted request restores it before departure. Roles and join dates are preserved.</p>';
}
async function mutate(path,method,body,message) {
  await Api.request(path,method,body);
  $("#modal").close();toast(message);await render();
}
async function action(name,id,target) {
  if(name==="close") {$("#modal").close();return;}
  if(name==="refresh") return render();
  if(name==="logout") {Session.clear();location.href="index.html";return;}
  if(name==="settings") {
    modal("Google Maps settings",'<form class="form-grid" data-form="maps-settings"><label class="full">Browser API key<input name="key" type="password" value="'+esc(localStorage.getItem("darbak.mapsKey")||"")+'" autocomplete="off" placeholder="Maps JavaScript browser key"></label><p class="hint full">Use a browser key restricted to this site. Only Maps JavaScript API is needed for point selection. Google Maps is loaded only when you choose to open it.</p><p class="hint full"><a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noopener">Google Maps setup guide ↗</a></p><div class="modal-footer"><button class="button">Save settings</button></div></form>');return;
  }
  if(name==="admin-tab") {state.adminTab=id;$("#main").innerHTML=await adminView();return;}
  if(name==="ride-tab") {state.rideTab=id;$("#main").innerHTML=myRidesView();return;}
  if(name==="save-match"||name==="remove-match") {
    if(!state.user) {location.href="login.html";return;}
    if(name==="remove-match"&&!confirm("Remove this match from your saved plan?")) return;
    return mutate("/user/"+state.user.id+"/matches/"+id,name==="save-match"?"POST":"DELETE",undefined,name==="save-match"?"Match saved to your plan.":"Match removed from your plan.");
  }
  if(name==="new-ride") {if(!state.user){location.href="login.html";return;} rideForm();return;}
  if(name==="edit-ride") {rideForm(findRide(id));return;}
  if(name==="ride-details") return rideDetails(id);
  if(name==="recommended") return recommendedRides();
  if(name==="join-ride") {
    if(!state.user) {location.href="login.html";return;}
    return mutate("/RideRequest/add/"+state.user.id+"/"+id,"POST",{},"Seat request sent. Watch for your WhatsApp update.");
  }
  if(["accept-request","reject-request"].includes(name)) {
    const request=state.data.requests.find(row=>row.id===Number(id));const ride=request?.ride;
    if(!ride?.driverId) throw new Error("Driver details are unavailable. Refresh and try again.");
    return mutate("/RideRequest/"+(name==="accept-request"?"accept":"reject")+"/"+id+"/"+ride.driverId,"POST",undefined,name==="accept-request"?"Request accepted. One seat reserved.":"Request rejected.");
  }
  if(name==="cancel-request") {
    if(!confirm("Cancel this seat request?"))return;
    return mutate("/RideRequest/cancel/"+id+"/"+state.user.id,"DELETE",undefined,"Seat request cancelled.");
  }
  if(name==="remove-participant") {
    if(!confirm("Remove this participant? A passenger's seat will be restored before departure.")) return;
    return mutate("/RidePerticipant/delete/"+id,"DELETE",undefined,"Participant removed.");
  }
  if(["cancel-ride","complete-ride","delete-ride"].includes(name)) {
    const ride=findRide(id);
    if(!confirm((name==="complete-ride"?"Mark this ride completed?":name==="cancel-ride"?"Cancel this ride and notify your passengers?":"Delete this ride? Linked bookings or reviews may prevent deletion.")))return;
    const route=name==="cancel-ride"?"cancel":name==="complete-ride"?"complete":"delete";
    return mutate("/Ride/"+route+"/"+id+"/"+ride.driverId,route==="delete"?"DELETE":"PUT",undefined,"Ride "+(route==="delete"?"deleted":route==="complete"?"completed":"cancelled")+".");
  }
  if(name==="new-car") {if(!state.user){location.href="login.html";return;}entityForm("car");return;}
  if(name==="edit-car") {entityForm("car",state.data.cars.find(row=>row.id===Number(id)),id);return;}
  if(name==="delete-car") {if(!confirm("Delete this car? Cars linked to rides may not be removable."))return;return mutate("/car/delete/"+id,"DELETE",undefined,"Car deleted.");}
  if(name==="edit-profile") {entityForm("user",state.data.users.find(row=>row.id===state.user.id),state.user.id);return;}
  if(name==="car-availability") {
    modal("Check car availability",'<form class="form-grid" data-form="car-availability" data-id="'+esc(id)+'"><label>Departure<input type="datetime-local" name="departure" required></label><label>Expected arrival<input type="datetime-local" name="expectedArrival" required></label><div class="modal-error" role="alert"></div><div class="modal-footer"><button class="button">Check availability</button></div><div id="availability-result" class="full"></div></form>');return;
  }
  if(name==="device-location") {
    const point=await Maps.locate();const form=$('[data-form="ride"]');form.elements.meetingLatitude.value=point.lat.toFixed(6);form.elements.meetingLongitude.value=point.lng.toFixed(6);$("#location-note").textContent="Device location selected. You can adjust the coordinates.";return;
  }
  if(name==="pick-map") {
    const form=$('[data-form="ride"]');const key=form.elements.mapsKey.value.trim();if(key)localStorage.setItem("darbak.mapsKey",key);
    const box=$("#pick-map");box.hidden=false;
    await Maps.show(box,{lat:form.elements.meetingLatitude.value,lng:form.elements.meetingLongitude.value},(lat,lng)=>{
      form.elements.meetingLatitude.value=lat.toFixed(6);form.elements.meetingLongitude.value=lng.toFixed(6);$("#location-note").textContent="Meeting point selected on the map.";
    });return;
  }
  if(name==="view-map") {
    const ride=findRide(id);const map=ride.map;const box=$("#view-map");box.hidden=false;
    await Maps.show(box,{lat:map.meetingLatitude,lng:map.meetingLongitude},null,{lat:map.stadiumLatitude,lng:map.stadiumLongitude});return;
  }
  if(name==="ride-availability") {
    const form=$('[data-form="ride"]');const values=Object.fromEntries(new FormData(form));const ride=form.dataset.id?findRide(form.dataset.id):null;
    const carId=ride?.carId||values.carId;
    if(!carId) throw new Error("Select a car first. For an older ride, check availability from your profile.");
    if(!values.departureDate||!values.departureTime||!values.expectedArrivalTime) throw new Error("Enter departure and expected arrival first.");
    if(ride) {toast("This check includes the current ride. Saving changes checks availability while excluding it.");}
    const conflict=await Api.request("/car/availability-conflict/"+carId+"?"+new URLSearchParams({departure:seconds(values.departureDate+"T"+values.departureTime),expectedArrival:seconds(values.expectedArrivalTime)}));
    $("#location-note").textContent=conflict?"This car has a ride during that time.":"This car is available for that time.";return;
  }
  if(name==="email-plan") {
    if(!state.user) {location.href="login.html";return;}
    toast("Sending your ride plan…");
    const result=await Api.request("/user/send-plan/"+state.user.id+"?lang=en","POST");
    toast(result?.message||"Your ride plan PDF has been sent to your email.");return;
  }
  if(name==="ai-plan") {
    modal("Your AI matchday plan",'<div class="loading">Building your matchday plan…</div>');
    const result=await Api.request("/user/ai-matchday-plan/"+state.user.id+"/en");
    $("#modal .modal-body").innerHTML='<div class="notice">'+result.upcomingRidesCount+' upcoming rides · '+result.matchesWithoutRidesCount+' matches need a ride</div><div class="result">'+esc(result.plan)+'</div>';return;
  }
  if(name==="feasibility") {
    const first=state.data.matches.find(row=>row.id===Number(target.dataset.first));const second=state.data.matches.find(row=>row.id===Number(target.dataset.second));
    modal("Can you attend both matches?",'<p class="muted">'+esc(matchTitle(first))+' → '+esc(matchTitle(second))+'</p><div class="loading">Checking your matchday…</div>');
    const result=await Api.request("/match/attendance-check/"+first.id+"/"+second.id);
    $("#modal .modal-body").innerHTML='<div class="notice '+(result.possibility?"":"warning")+'"><strong>'+esc(result.recommendation)+'</strong></div><div class="detail-list"><div><span>Estimated travel time</span><strong>'+esc(result.estimatedArrivalMinutes)+' minutes</strong></div></div><ul>'+((Array.isArray(result.advice)?result.advice:[]).map(tip=>'<li>'+esc(tip)+'</li>').join(""))+'</ul><p class="hint">This is an AI estimate, without live traffic data.</p>';return;
  }
  if(name==="ai-summary") {
    modal("What fans say",'<div class="loading">Summarizing community reviews…</div>');
    const result=await Api.request("/user/review-summary/"+id);
    $("#modal .modal-body").innerHTML='<div class="notice">'+result.reviewCount+' reviews · ★ '+Number(result.averageRating).toFixed(1)+'</div><div class="result">'+esc(result.summary)+'</div>';return;
  }
  if(name==="new-review") {if(!state.user){location.href="login.html";return;}reviewForm(id);return;}
  if(name==="edit-review") {
    const reviews=state.reviews||await Api.list("/review/get");const review=reviews.find(row=>row.id===Number(id));if(!review)throw new Error("Review not found.");reviewForm(review.ride?.id,review);return;
  }
  if(name==="delete-review") {if(!confirm("Delete this review?"))return;return mutate("/review/delete/"+id,"DELETE",undefined,"Review deleted.");}
  if(name==="new-entity") {entityForm(id);return;}
  if(name==="edit-entity") {
    const kind=target.dataset.kind;const rows={stadium:state.data.stadiums,match:state.data.matches,user:state.data.users,admin:state.admins};
    entityForm(kind,rows[kind].find(row=>row.id===Number(id)),id);return;
  }
  if(name==="delete-entity") {
    const kind=target.dataset.kind;if(!confirm("Delete this "+kind+"? Linked records may prevent deletion."))return;
    return mutate("/"+kind+"/delete/"+id,"DELETE",undefined,kind[0].toUpperCase()+kind.slice(1)+" deleted.");
  }
  if(name==="ban-user") {if(!confirm("Ban this fan? They will not be able to sign in."))return;return mutate("/admin/ban/"+id,"PUT",undefined,"Fan banned.");}
  if(name==="fan-stats") {
    modal("Fan activity",'<div class="loading">Loading fan activity…</div>');
    const user=state.data.users.find(row=>row.id===Number(id));
    const [rides,matches,rating]=await Promise.all([Api.request("/user/ride-statistics/"+id),Api.request("/user/match-statistics/"+id),Api.request("/user/average-rating/"+id)]);
    $("#modal .modal-body").innerHTML='<h2>'+esc(user.name)+'</h2><div class="grid two">'+statCard("Rides offered",rides.totalRidesAsDriver,"car")+statCard("Rides joined",rides.totalRidesAsPassenger,"people")+statCard("Matches through rides",matches.totalMatches,"ball")+statCard("Average rating",Number(rating).toFixed(1),"star")+'</div><div class="section">'+button("AI review summary","ai-summary",id,"small")+'</div>';return;
  }
  if(name==="bulk-stadiums") {
    modal("Add stadiums in bulk",'<form class="form-grid" data-form="bulk-stadiums"><label class="full">Stadium list (JSON)<textarea class="bulk" name="json" required placeholder=\'[{"name":"Stadium name","city":"Riyadh","address":"Stadium address","latitude":24.7,"longitude":46.6}]\'></textarea></label><p class="hint full">Existing stadium names are skipped.</p><div class="modal-error" role="alert"></div><div class="modal-footer"><button class="button">Add stadiums</button></div></form>');return;
  }
  if(name==="import-matches") {
    if(!confirm("Import the configured football fixtures? The backend imports historical fixtures with shifted demo dates. A configured Football API key and matching stadiums are required."))return;
    const count=await Api.request("/football/import-test-matches","POST");toast(String(count)+" fixtures imported.");await render();return;
  }
  if(name==="manage-bookings") return manageBookings(id);
  if(name==="add-participant") {
    modal("Add participant to ride #"+id,'<form class="form-grid" data-form="participant" data-id="'+esc(id)+'"><label>Fan<select name="userId" required>'+options(state.data.users,row=>row.name)+'</select></label><label>Role<select name="role"><option value="passenger">Passenger</option><option value="driver">Assigned ride driver</option></select></label><p class="hint full">A passenger reserves one seat and receives an accepted request. Only the assigned driver may use the driver role.</p><div class="modal-error" role="alert"></div><div class="modal-footer"><button class="button">Add participant</button></div></form>');return;
  }
  if(name==="request-status") {
    modal("Update pending request",'<form class="form-grid" data-form="request-status" data-id="'+esc(id)+'"><label class="full">Decision<select name="status"><option value="accepted">Accept and reserve a seat</option><option value="rejected">Reject</option></select></label><div class="modal-error" role="alert"></div><div class="modal-footer"><button class="button">Save decision</button></div></form>');return;
  }
  if(name==="delete-request") {
    if(!confirm("Delete this request? An accepted booking will also remove the passenger and restore the seat before departure."))return;
    return mutate("/RideRequest/delete/"+id,"DELETE",undefined,"Request deleted.");
  }
}

async function submitForm(form) {
  const values=Object.fromEntries(new FormData(form));
  const kind=form.dataset.form;
  if(kind==="login") {
    await Api.login(values.email.trim(),values.password);location.href="index.html";return;
  }
  if(kind==="register") {
    await Api.request("/user/register","POST",{name:values.name.trim(),email:values.email.trim(),password:values.password,phoneNumber:values.phoneNumber.trim()});
    await Api.login(values.email.trim(),values.password);location.href="index.html";return;
  }
  if(kind==="match-filter") return filterMatches(values);
  if(kind==="ride-filter") return filterRides(values);
  if(kind==="plan-filter") {
    const without=await Api.list("/user/"+state.user.id+"/matches/without-rides");
    const rows=[...state.saved].filter(match=>!values.day||match.startTime.slice(0,10)===values.day).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    $("#schedule-results").innerHTML=scheduleRows(rows,new Set(without.map(match=>match.id)));return;
  }
  if(kind==="maps-settings") {
    if(values.key.trim()) localStorage.setItem("darbak.mapsKey",values.key.trim());else localStorage.removeItem("darbak.mapsKey");
    $("#modal").close();toast("Map settings saved. Reload this page if you have already opened a map.");return;
  }
  if(kind==="entity") {
    const entity=form.dataset.kind;const id=form.dataset.id;
    const body={...values};
    if(entity==="car") body.seatsCount=Number(values.seatsCount);
    if(entity==="stadium") {body.latitude=Number(values.latitude);body.longitude=Number(values.longitude);}
    if(entity==="match") {body.stadium={id:Number(values.stadium)};body.startTime=seconds(values.startTime);body.expectedEndTime=seconds(values.expectedEndTime);}
    const route=id?"/"+entity+"/update/"+id:entity==="car"?"/car/add/"+state.user.id:"/"+entity+"/add";
    await Api.request(route,id?"PUT":"POST",body);
    if(entity==="car"&&!id) {
      const cars=await Api.list("/car/get");const car=cars.find(row=>row.plateNumber===body.plateNumber);
      if(car) BrowserLinks.car(car.id,state.user.id);
    }
    if(entity==="user"&&Number(id)===state.user?.id) {Session.set({id:Number(id),...body});state.user=Session.get();}
    $("#modal").close();toast("Changes saved.");await render();return;
  }
  if(kind==="ride") {
    const id=form.dataset.id;const oldRide=id?findRide(id):null;
    const body={
      departureDate:values.departureDate,departureTime:values.departureTime.length===5?values.departureTime+":00":values.departureTime,
      expectedArrivalTime:seconds(values.expectedArrivalTime),meetingPoint:values.meetingPoint.trim(),
      meetingLatitude:Number(values.meetingLatitude),meetingLongitude:Number(values.meetingLongitude),
      destination:values.destination.trim(),availableSeats:Number(values.availableSeats),notes:values.notes.trim()
    };
    if(new Date(body.expectedArrivalTime)<=new Date(rideDate(body))) throw new Error("Expected arrival must be after departure.");
    const match=state.data.matches.find(row=>row.id===Number(oldRide?.matchId||values.matchId));
    if(match&&new Date(body.expectedArrivalTime)>=new Date(match.startTime)) throw new Error("Expected arrival must be before kickoff.");
    const route=id?"/Ride/update/"+id+"/"+state.user.id:"/Ride/add/"+state.user.id+"/"+values.matchId+"/"+values.carId;
    await Api.request(route,id?"PUT":"POST",body);
    if(!id) {
      const rides=await Api.list("/Ride/driver/"+state.user.id);
      const created=rides.filter(row=>row.departureDate===body.departureDate&&row.departureTime.slice(0,5)===body.departureTime.slice(0,5)&&row.meetingPoint===body.meetingPoint).sort((a,b)=>b.id-a.id)[0];
      if(created) BrowserLinks.ride(created.id,Number(values.carId));
      BrowserLinks.car(Number(values.carId),state.user.id);
    }
    $("#modal").close();toast(id?"Ride updated.":"Your shared ride is ready.");await render();return;
  }
  if(kind==="car-availability") {
    if(new Date(values.expectedArrival)<=new Date(values.departure)) throw new Error("Expected arrival must be after departure.");
    const conflict=await Api.request("/car/availability-conflict/"+form.dataset.id+"?"+new URLSearchParams({departure:seconds(values.departure),expectedArrival:seconds(values.expectedArrival)}));
    $("#availability-result").innerHTML='<div class="notice '+(conflict?"warning":"")+'">'+(conflict?"This car has a ride during that time.":"This car is available for that time.")+'</div>';return;
  }
  if(kind==="review") {
    const body={rating:Number(values.rating),comment:values.comment.trim()||null};
    if(form.dataset.id) return mutate("/review/update/"+form.dataset.id,"PUT",body,"Review updated.");
    body.rideId=Number(form.dataset.ride);body.reviewerId=state.user.id;body.reviewedUserId=Number(values.reviewedUserId);
    return mutate("/review/add","POST",body,"Thanks for sharing your experience.");
  }
  if(kind==="user-filter") {
    let rows;
    if(values.rating) rows=(await Api.list("/user/"+values.rating+"-average-rating")).map(row=>Api.safeUser(row));
    else if(values.name.trim()) rows=(await Api.list("/user/search/"+encodeURIComponent(values.name.trim()))).map(row=>Api.safeUser(row));
    else rows=state.data.users;
    if(values.name.trim())rows=rows.filter(row=>row.name.toLowerCase().includes(values.name.trim().toLowerCase()));
    $("#user-results").innerHTML=userTable(rows);return;
  }
  if(kind==="bulk-stadiums") {
    let body;try{body=JSON.parse(values.json);}catch{throw new Error("Enter a valid JSON list of stadiums.");}
    if(!Array.isArray(body)||!body.length)throw new Error("Enter at least one stadium in a JSON list.");
    const count=await Api.request("/stadium/add-all","POST",body);$("#modal").close();toast(String(count)+" stadiums added.");await render();return;
  }
  if(kind==="participant") return mutate("/RidePerticipant/add/"+form.dataset.id+"/"+values.userId,"POST",{role:values.role},"Participant added.");
  if(kind==="request-status") return mutate("/RideRequest/update/"+form.dataset.id,"PUT",{status:values.status},"Request updated.");
}
document.addEventListener("click",async event=>{
  const target=event.target.closest("[data-action]");
  if(!target||target.disabled)return;
  event.preventDefault();target.disabled=true;
  try {await action(target.dataset.action,target.dataset.id||"",target);}
  catch(error) {if($("#modal").open)modalError(error.message);else toast(error.message,true);}
  finally {target.disabled=false;}
});
document.addEventListener("submit",async event=>{
  const form=event.target.closest("[data-form]");if(!form)return;
  event.preventDefault();
  const controls=[...form.querySelectorAll("button")];controls.forEach(button=>button.disabled=true);
  const errorBox=form.querySelector(".modal-error");if(errorBox)errorBox.textContent="";
  try {await submitForm(form);}
  catch(error) {if(errorBox)errorBox.textContent=error.message;else toast(error.message,true);}
  finally {controls.forEach(button=>button.disabled=false);}
});
document.addEventListener("change",event=>{
  const form=event.target.closest('[data-form="ride"]');if(!form)return;
  if(event.target.name==="matchId") {
    const match=state.data.matches.find(row=>row.id===Number(event.target.value));
    if(!match)return;
    form.elements.destination.value=match.stadium?.name||"";
    const kickoff=new Date(match.startTime);
    const localISO=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString();
    const departure=new Date(kickoff.getTime()-120*60000);const arrival=new Date(kickoff.getTime()-60*60000);
    form.elements.departureDate.value=localISO(departure).slice(0,10);
    form.elements.departureTime.value=localISO(departure).slice(11,16);
    form.elements.expectedArrivalTime.value=localISO(arrival).slice(0,16);
  }
  if(event.target.name==="carId") {
    const car=state.data.cars.find(row=>row.id===Number(event.target.value));
    if(car){form.elements.availableSeats.max=car.seatsCount-1;form.elements.availableSeats.value=Math.min(Number(form.elements.availableSeats.value),car.seatsCount-1);}
  }
});
$("#modal").addEventListener("click",event=>{if(event.target===$("#modal")){const rect=$("#modal").getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$("#modal").close();}});
render();
