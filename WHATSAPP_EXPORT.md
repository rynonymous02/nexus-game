# WhatsApp Export Format

## Export Logic

When user clicks "📤 Kirim ke WhatsApp", the system will:

1. Calculate total size of all games in cart
2. Calculate total price
3. Format a structured message
4. Open WhatsApp with pre-filled message to **0881-0277-64090**

## Sample WhatsApp Message Output

```
PESANAN BACKUP GAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Total Game: 3 game
💾 Total Size: 156 GB
💰 Total Harga: Rp 45.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETAIL GAME:

1. Cyberpunk 2077
   📀 Category: Besar
   💾 Size: 68 GB
   💰 Harga: Rp 20.000

2. Elden Ring
   📀 Category: Besar
   💾 Size: 49 GB
   💰 Harga: Rp 15.000

3. Hollow Knight
   📀 Category: Cilik
   💾 Size: —
   💰 Harga: Rp 5.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Silakan transfer sesuai total harga.
Terima kasih! 🎮
```

## Features

✅ **Total Size Calculation**
- Automatically calculates sum of all game sizes
- Displays in GB (gigabytes)
- Rounds to 1 decimal place
- Shows "—" if no size data available

✅ **Formatted Message**
- Clean, readable format
- Bold text for emphasis
- Emoji icons for visual clarity
- Organized by numbered list

✅ **Direct WhatsApp Integration**
- Opens WhatsApp automatically
- Pre-fills message to admin number
- Works on mobile and desktop
- Uses international format: +62 881-0277-64090

## Cart Display Updates

The cart panel now shows:
```
Subtotal        Rp 45.000
Total Game      3 game
Total Size      156 GB     ← NEW!
Total           Rp 45.000
```

## Technical Details

### Size Parsing
- Handles formats: "45 GB", "45,5 GB", "45.5 GB"
- Returns null for empty or invalid sizes
- Only adds valid sizes to total

### Total Calculation
```javascript
calculateTotalSize(cartItems) {
  let total = 0;
  cartItems.forEach(g => {
    const gb = parseGB(g.size);
    if (gb !== null) {
      total += gb;
    }
  });
  return Math.round(total * 10) / 10; // Round to 1 decimal
}
```

### WhatsApp URL Format
```
https://wa.me/62881027764090?text=<encoded_message>
```

Note: Phone number uses international format without "+" symbol.
