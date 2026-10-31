# Presentation aur Viva Preparation (Hinglish)

> Neeche ke jawab is project ke actual code par based hain. Jo cheez abhi test nahi hui (browser testing), uske baare mein bhi honestly bolna: "server logic ke automated tests pass hue, browser testing checklist `docs/TESTING.md` mein hai."

## 1. Short introduction (30 second)

"DrawZone ek real-time multiplayer drawing aur guessing game hai. Players room code se ek room mein aate hain. Ek player secret word draw karta hai, baaki guess karte hain. Points server calculate karta hai aur end mein leaderboard aata hai. Frontend React + TypeScript mein hai, backend Node.js, Express aur Socket.IO mein."

## 2. Architecture (simple bhasha mein)

- Browser (React) aur server (Node) ke beech **Socket.IO** ka persistent connection rehta hai. Normal website mein browser pehle request bhejta hai, tab jawab aata hai. Yahan server khud bhi kabhi bhi browser ko data bhej sakta hai (jaise dusre player ki drawing).
- **Server hi "boss" hai.** Timer, score, kaun draw karega, secret word: sab server ke paas. Browser sirf dikhata hai aur requests bhejta hai. Isse cheating mushkil hoti hai.
- Har room ka data server ki memory mein ek `Map` mein hai (`rooms.js`). Database nahi hai.
- `handlers.js` events lete hain aur check karte hain (kaun bhej raha hai, sahi phase hai?). `game.js` game ke rules chalata hai.

## 3. Technology kyun?

- **React**: UI ko state se chalata hai. Server se naya state aaya to screen khud update. Components reuse hote hain.
- **TypeScript**: galtiyan (galat data type) code likhte waqt pakad leta hai.
- **Vite**: tez development server.
- **Node.js + Express**: JavaScript dono taraf, isliye ek hi language seekhni padi. Express se `/health` jaisa HTTP endpoint.
- **Socket.IO**: WebSocket par bana hai, rooms, acknowledgments, automatic reconnect deta hai. Raw WebSocket mein ye sab khud likhna padta.

## 4. Real-time drawing kaise kaam karti hai?

1. Drawer ka mouse/finger move hota hai (Pointer Events).
2. Canvas par locally turant line banti hai (delay nahi lagta).
3. Points ko 0 se 1 ke fraction mein badla jata hai (jaise x = 0.5 matlab beech). Isliye alag screen size par bhi same drawing dikhti hai.
4. Har 40 ms par points ka chhota batch `drawing_move` se server ko jata hai (har pixel alag bhejne se server flood ho jata).
5. Server check karta hai: sender drawer hai? phase `drawing` hai? coordinates 0-1 mein hain? color `#RRGGBB` hai? Sahi ho to **sirf usi room ke dusre players** ko bhejta hai.
6. Dusre browsers wahi lines apne canvas par banate hain.

## 5. Scoring kaise kaam karti hai?

`points = max(10, floor(100 * bachaHuaSamay / kulSamay))`. Jaldi guess = zyada points. Samay server ki clock se naapa jata hai, client par bharosa nahi. Har player ek turn mein sirf ek baar score kar sakta hai (`room.correct` Map). Drawer ko har sahi guesser par 20 points.

## 6. Secret word ki security

- Word options sirf drawer ko `word_options` se jaate hain.
- `room_updated` har player ke liye alag banta hai: guesser ko sirf `_ _ _ _` (length) milta hai.
- Sahi guess ka text chat mein broadcast nahi hota.
- Automated test is baat ko check karta hai (guesser ke saare received messages mein word nahi hona chahiye).

## 7. Main challenges

- Timers aur phases ko consistent rakhna (har phase badalne par purana timer cancel).
- Player beech game mein chala jaye (drawer ya host) to kya ho: rules decide karke test likhe.
- Drawing ko efficient banana (batching, normalized coordinates).
- Port conflicts aur Windows PowerShell issues.

## 8. Limitations (honestly bolo)

- Database nahi: server restart hone par rooms chale jaate hain; ek hi server process.
- Login nahi: room code security nahi, sirf pehchaan hai.
- Connection toot jaye to player room se nikal jata hai (auto-rejoin nahi).
- Undo, spectators, game ke beech join: nahi hai.
- Browser-level testing abhi aapko chalani hai (`docs/TESTING.md`).

## 9. Future improvements

Database/Redis se rooms save karna, reconnect token se rejoin, undo, custom words aur languages, chat moderation, spectators, sound effects, deployment (HTTPS) aur `CLIENT_ORIGINS` set karna.

## 10. Common viva questions

**Q1. WebSocket aur HTTP mein kya fark hai?**
HTTP mein client request bhejta hai aur server jawab deta hai, phir connection khatam. WebSocket mein connection khula rehta hai aur dono taraf se kabhi bhi data ja sakta hai. Real-time games ke liye ye zaroori hai.

**Q2. Socket.IO WebSocket se alag kaise hai?**
Socket.IO WebSocket ke upar ek library hai: rooms, event names, acknowledgments, timeouts aur reconnection deta hai, aur WebSocket na chale to polling par fallback karta hai.

**Q3. Room kya hai aur isolation kaise hota hai?**
Socket.IO mein "room" sockets ka group hai. Server `socket.to(roomCode).emit(...)` se sirf usi group ko bhejta hai. Doosre room ko kuch nahi milta (test: drawing relay isolation).

**Q4. Client ko trust kyun nahi karte?**
Client browser mein badla ja sakta hai. Isliye server har baar check karta hai: kaun bhej raha hai (`socket.id`), host hai ya nahi, sahi phase hai ya nahi. Score client se kabhi accept nahi hota.

**Q5. Acknowledgment kya hota hai?**
Client `emit` ke saath ek callback deta hai; server kaam karke us callback ko `{ok:true,...}` ya `{ok:false,error}` bhejta hai. Isse button dabane par hamesha jawab milta hai. Hamne 5 second timeout bhi lagaya.

**Q6. Memory leak kaise roka?**
Room khali hote hi `RoomStore.delete` room hata deta hai aur uska timer `clearTimeout` karta hai. Har phase badalne par purana timer cancel hota hai. React mein `useEffect` ke cleanup se `socket.off` hota hai.

**Q7. Tie kaise handle hoti hai?**
Same score walon ko same rank milti hai (1, 1, 3). Top score wale sabhi winner dikhte hain.

**Q8. Drawer beech mein chala jaye to?**
Turn turant khatam, summary dikhti hai (reason: drawer left), phir agla player draw karta hai. Agar 2 se kam players bachein to game final screen par khatam.

**Q9. Rate limiting kyun?**
Koi client bahut zyada events bhejkar server ko slow na kar sake. Drawing events 240 per second tak, guesses 6 per 3 seconds.

**Q10. Is project ko production mein kyun nahi chala sakte as-is?**
In-memory state (restart par data loss), koi authentication nahi, ek hi server process. Production ke liye database/Redis, auth, HTTPS aur proper monitoring chahiye.

**Q11. React state aur socket events kaise sync rahte hain?**
`useGame` hook ek baar listeners lagata hai (`useEffect`), server ka naya `RoomView` aate hi `setRoom` hota hai, aur React screen update karta hai. Component hatne par `socket.off` se listeners hat jaate hain.

**Q12. Ye project kya test karta hai aur kya nahi?**
Server ke game rules ke 39 automated tests pass hue (fake socket layer par). Real sockets ka integration test aur browser/mobile testing ki checklist `TESTING.md` mein hai; unhe aapko chalana hai.
