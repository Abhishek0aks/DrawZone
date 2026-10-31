# Setup aur Troubleshooting (Windows, Hinglish)

## Pehle ye samjho

- **Terminal** ek jagah hai jahan hum commands likhte hain. Har terminal ek alag "session" hota hai.
- **Backend** (server) aur **frontend** (website) do alag programs hain, isliye **do terminals** chahiye. Dono ko khula rakho.
- **Port** ek "darwaza number" hai. Backend port 3001 use karta hai, frontend (Vite) 5173. Ek port par ek hi program chal sakta hai.
- **Root folder** `C:\game_project` hai. `client` aur `server` uske andar ke folders hain. `npm.cmd install` hamesha usi folder ke andar chalao jisme `package.json` hai.

## Purane project ko safe rakhna (zip lagane se pehle)

Zip ko delete-and-replace mat karo. Pehle purana folder ka naam badal do:

```powershell
cd C:\
Rename-Item game_project game_project_old
```

Phir zip ko `C:\` mein extract karo taaki `C:\game_project\client` aur `C:\game_project\server` bane. Purana `.git` folder chahiye to `game_project_old\.git` ko naye `game_project` mein copy kar sakte ho (agar Git history rakhni hai).

## Install aur run

Terminal 1:

```powershell
cd C:\game_project\server
npm.cmd install
node server.js
```

Dikhna chahiye: `DrawZone server running at http://localhost:3001`. Browser mein `http://localhost:3001/health` kholo, `{"status":"ok",...}` aana chahiye.

Terminal 2:

```powershell
cd C:\game_project\client
npm.cmd install
npm.cmd run dev
```

Vite jo URL print kare (jaise `http://localhost:5173/`) wahi browser mein kholo.

## Common errors

| Error | Matlab | Fix |
|---|---|---|
| `EADDRINUSE: port 3001` | Backend pehle se chal raha hai (dusre terminal mein) | Purane terminal mein `Ctrl + C`. Dusra server mat chalao. Check: `netstat -ano \| findstr :3001`, phir `taskkill /PID <number> /F` |
| Vite `5174` par khula | 5173 busy tha (purana Vite chal raha hai) | Jo URL print hua wahi use karo, ya purana Vite band karo |
| `npm : File ... cannot be loaded because running scripts is disabled` | PowerShell `npm.ps1` script block karta hai | `npm.cmd` use karo (jaise upar). Execution policy kamzor karne ki zaroorat nahi |
| `npm ERR! code EJSONPARSE` | `package.json` khali ya galat hai | Us folder ki `package.json` kholo, JSON theek karo. Is zip ki files sahi hain |
| `Cannot find module 'express'` | `npm.cmd install` server folder mein nahi chala | `cd C:\game_project\server` phir `npm.cmd install` |
| Home par "Server unavailable" | Backend band hai ya port alag hai | Terminal 1 mein `node server.js` chalao; `/health` check karo |
| Create Room dabane par error "did not answer in time" | Frontend ne server tak request bheji par jawab nahi aaya | Backend terminal ke logs dekho; dono terminals restart karo (sirf ek ek baar) |
| Phone se nahi khulta | Firewall ya alag Wi-Fi | Laptop aur phone same Wi-Fi par ho; `http://<laptop-IP>:5173` kholo; Windows Firewall mein Node.js allow karo (`ipconfig` se IP milega) |
| CORS error console mein | Browser ka origin allowed nahi | Localhost aur LAN IP default mein allowed hain. Alag domain ho to `$env:CLIENT_ORIGINS = "https://your-site"` set karke backend restart karo |
| Page blank | Frontend error | Browser `F12` > Console dekho; Terminal 2 ke errors dekho |

## Debug ka tareeka (kuch kaam na kare to)

1. Browser Console (`F12`) dekho.
2. Dono terminals ke messages dekho.
3. Top-right status chip dekho (Connected hai?).
4. `F12` > Network > WS mein dekho ki events (`create_room`, ...) ja rahe hain.
5. Problem dobara reproduce karo, fir ek-ek cheez badlo.

Bina wajah ke `node_modules` delete karke dobara install mat karo.

## Game ki settings badalna

`server\src\config.js` mein `rounds`, `drawSeconds`, `minPlayers` etc. badalo, backend restart karo.
