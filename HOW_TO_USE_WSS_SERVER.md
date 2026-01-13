# Hướng Dẫn Sử Dụng MQTT WebSocket Server

## 📋 Tổng Quan

MQTT WebSocket Server đã được tách ra thành một project **hoàn toàn độc lập** tại folder `mqtt-wss-server/`.

**Lợi ích:**
- ✅ Code sạch hơn, không còn duplicate logic MQTT
- ✅ Dễ maintain và debug
- ✅ Có thể deploy độc lập
- ✅ Scale riêng biệt khi cần
- ✅ Không còn deprecation warning

## 🚀 Quick Start

### 1. Setup WebSocket Server

```bash
# Chuyển vào folder mqtt-wss-server
cd mqtt-wss-server

# Cài đặt dependencies
npm install

# Copy và cấu hình .env
cp .env.example .env

# Chỉnh sửa .env (nếu cần)
# - MONGODB_URI: Connection string tới MongoDB
# - WSS_PORT: Port của WebSocket server (default: 8080)
```

### 2. Chạy WebSocket Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server sẽ chạy trên `ws://localhost:8080`

### 3. Chạy Next.js App (Terminal khác)

```bash
# Quay lại folder root (stock_t0)
cd ..

# Start Next.js app
npm run dev
```

## 📝 Cấu Hình

### Environment Variables

**mqtt-wss-server/.env:**
```env
MONGODB_URI=mongodb://localhost:27017/stock_t0
WSS_PORT=8080
DEBUG=false
```

**stock_t0/.env (Next.js project):**
```env
# Nếu muốn client-side connect tới WSS
NEXT_PUBLIC_WSS_URL=ws://localhost:8080

# Hoặc server-side
WSS_URL=ws://localhost:8080
```

## 💻 Sử Dụng trong Code

### Option 1: Direct WebSocket Connection (Recommended)

Từ Next.js API routes, bạn có thể kết nối trực tiếp:

```typescript
// app/api/stocks/[id]/route.ts
import WebSocket from 'ws';

const WSS_URL = process.env.WSS_URL || 'ws://localhost:8080';

async function subscribeStock(code: string, investorToken: string, investorId: string, userId: string) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WSS_URL);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        code,
        investorToken,
        investorId,
        userId
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'price_update') {
        console.log(`Price updated for ${code}: ${message.data.marketPrice}`);
        ws.close();
        resolve(message.data);
      }
      
      if (message.type === 'error') {
        ws.close();
        reject(new Error(message.error));
      }
    });

    ws.on('error', reject);
  });
}

// Sử dụng
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // ... existing code ...
  
  if (stock.marketPrice === 0) {
    subscribeStock(
      stock.code,
      investorToken,
      investorId,
      user._id.toString()
    ).catch(console.error);
  }
  
  return NextResponse.json(stock);
}
```

### Option 2: Create a Service Helper

Tạo file `lib/services/wss-client.ts`:

```typescript
import WebSocket from 'ws';

const WSS_URL = process.env.WSS_URL || 'ws://localhost:8080';

export async function subscribeStockPrice(
  code: string,
  investorToken: string,
  investorId: string,
  userId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WSS_URL);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 15000);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        code,
        investorToken,
        investorId,
        userId
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'price_update') {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
      
      if (message.type === 'error' || message.type === 'auth_error') {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(message.error));
      }
      
      if (message.type === 'timeout') {
        clearTimeout(timeout);
        ws.close();
        resolve(); // Stock might not have data
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
```

Sử dụng:

```typescript
import { subscribeStockPrice } from '@/lib/services/wss-client';

// Trong API route
await subscribeStockPrice(code, investorToken, investorId, userId);
```

## 🧪 Testing

### Test WebSocket Server

```bash
cd mqtt-wss-server
npm test
```

### Manual Test với wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:8080

# Send ping
{"type":"ping"}

# Should receive pong
{"type":"pong","timestamp":1234567890}
```

## 🚢 Deployment

### Development (2 Terminals)

**Terminal 1:**
```bash
cd mqtt-wss-server
npm run dev
```

**Terminal 2:**
```bash
cd stock_t0  # hoặc . nếu đang ở root
npm run dev
```

### Production với PM2

```bash
# Install PM2
npm install -g pm2

# Start WebSocket Server
cd mqtt-wss-server
pm2 start src/index.js --name mqtt-wss

# Start Next.js App
cd ../stock_t0
pm2 start npm --name nextjs -- start

# Save config
pm2 save
pm2 startup
```

### Docker Compose

Xem file `mqtt-wss-server/INTEGRATION.md` để biết cách setup với Docker.

## 📊 Monitoring

### Check WebSocket Server Status

```bash
# PM2
pm2 status
pm2 logs mqtt-wss

# Direct
curl http://localhost:8080  # Nếu có HTTP health endpoint
```

### Send Health Check

Từ code:

```typescript
const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'health' }));
});
ws.on('message', (data) => {
  console.log(JSON.parse(data.toString()));
  // { type: 'health', status: 'ok', uptime: 3600, ... }
});
```

## ❓ Troubleshooting

### WebSocket Server không start

1. **Port 8080 đã được sử dụng:**
   ```bash
   # Windows
   netstat -ano | findstr :8080
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:8080 | xargs kill -9
   ```

2. **MongoDB không chạy:**
   ```bash
   # Start MongoDB
   sudo systemctl start mongod
   
   # Hoặc
   mongod
   ```

3. **Dependencies chưa cài:**
   ```bash
   cd mqtt-wss-server
   npm install
   ```

### Next.js không connect được

1. **Check WSS_URL:**
   ```bash
   echo $WSS_URL  # Linux/Mac
   echo %WSS_URL%  # Windows CMD
   $env:WSS_URL   # Windows PowerShell
   ```

2. **Test WebSocket Server:**
   ```bash
   cd mqtt-wss-server
   npm test
   ```

3. **Check logs:**
   ```bash
   pm2 logs mqtt-wss
   ```

## 📚 Documentation

Chi tiết hơn tại:
- `mqtt-wss-server/README.md` - Full documentation
- `mqtt-wss-server/QUICKSTART.md` - Quick start guide
- `mqtt-wss-server/INTEGRATION.md` - Integration details

## 🎯 Next Steps

1. ✅ Setup và chạy WebSocket Server
2. ✅ Test bằng `npm test`
3. ✅ Update API endpoints để dùng WebSocket connection
4. ✅ Deploy production theo hướng dẫn
5. ✅ Setup monitoring

## 💡 Tips

- **Development:** Luôn chạy WebSocket server trước Next.js app
- **Production:** Dùng PM2 để auto-restart khi crash
- **Scaling:** WebSocket server có thể deploy trên server riêng
- **Monitoring:** Check logs thường xuyên bằng `pm2 logs`
- **Debug:** Enable DEBUG=true trong `.env` để xem chi tiết

## 🆘 Support

Nếu gặp vấn đề:
1. Check logs của cả 2 servers (WSS + Next.js)
2. Run test suite (`npm test` trong mqtt-wss-server)
3. Verify environment variables
4. Đọc troubleshooting guide trong README
5. Contact development team
