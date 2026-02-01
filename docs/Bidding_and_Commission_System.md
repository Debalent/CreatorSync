# CreatorSync Bidding and Commission System

## Overview
CreatorSync now includes a comprehensive bidding system and platform commission structure that allows sellers to list their beats with flexible pricing options while ensuring the platform receives a 12.5% commission on all transactions.

## Platform Commission

### Commission Rate
- **Fixed Rate**: 12.5% on all transactions
- **Applied To**: All beat sales (both standard pricing and auction wins)
- **Calculation**: Automatically calculated on payment processing

### Commission Breakdown Example
```javascript
Total Sale Price: $100.00
Platform Commission (12.5%): $12.50
Seller Earnings: $87.50
```

## Pricing Types

### 1. Standard Pricing
- **Description**: Traditional fixed-price listing set by the seller
- **How It Works**:
  - Seller sets a fixed price for their beat
  - Buyers purchase at the listed price
  - Immediate transaction completion
- **Best For**: Sellers who want predictable pricing and quick sales

### 2. Bidding/Auction
- **Description**: Auction-style pricing where buyers compete with bids
- **Requirements**:
  - Only available for **trending beats**
  - Seller must set a minimum bid price
  - Seller must set auction duration (default: 7 days)
- **How It Works**:
  - Buyers place bids starting at minimum price
  - Each new bid must be at least 5% higher than current bid
  - Highest bidder wins when auction ends
  - 12.5% commission applies to final bid amount
- **Best For**: High-demand or unique beats that can generate competitive bidding

## Trending Status

### What Makes a Beat Trending?
- High play count
- High like/favorite count
- Recent popularity surge
- Admin designation
- Seller can mark own beats as trending (in current implementation)

### Trending Benefits
- **Pricing Flexibility**: Can switch between standard and bidding
- **Increased Visibility**: Featured in trending sections
- **Higher Potential Earnings**: Bidding can drive up price above original listing

### Switching Pricing Type
Sellers can switch pricing types for trending beats:
```
Standard → Bidding: Requires min price and duration
Bidding → Standard: Can revert back to fixed pricing
```

## API Endpoints

### Bidding Endpoints

#### Switch Pricing Type
```http
PUT /api/bidding/beats/:id/pricing-type
```
**Request Body**:
```json
{
  "pricingType": "bidding",
  "minBidPrice": 50.00,
  "biddingDuration": 7
}
```

#### Place a Bid
```http
POST /api/bidding/beats/:id/bid
```
**Request Body**:
```json
{
  "bidAmount": 75.00
}
```

#### Get Bid History
```http
GET /api/bidding/beats/:id/bids?page=1&limit=20
```

#### Get Active Auctions
```http
GET /api/bidding/beats/bidding/active?category=Hip%20Hop&sortBy=ending-soon
```

#### Mark as Trending
```http
PUT /api/bidding/beats/:id/trending
```
**Request Body**:
```json
{
  "trending": true
}
```

### Payment Endpoints (Updated)

#### Create Payment Intent
```http
POST /api/payments/create-payment-intent
```
**Request Body**:
```json
{
  "beatId": "beat-uuid",
  "amount": 100.00,
  "licenseType": "standard",
  "pricingType": "bidding",
  "isBidding": true
}
```

**Response**:
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "transactionId": "trans-uuid",
  "amount": 100.00,
  "commission": {
    "totalAmount": 100.00,
    "platformCommission": 12.50,
    "sellerEarnings": 87.50,
    "commissionRate": 0.125
  }
}
```

#### Get Earnings (Updated)
```http
GET /api/payments/earnings
```
**Response** (now includes commission details):
```json
{
  "success": true,
  "earnings": {
    "total": 2847.50,
    "platformCommissionRate": 0.125,
    "totalCommission": 410.21,
    "transactions": [
      {
        "id": "trans-uuid",
        "type": "sale",
        "beatTitle": "Urban Nights",
        "amount": 35.00,
        "platformCommission": 4.38,
        "sellerEarnings": 30.62,
        "pricingType": "standard",
        "status": "completed"
      }
    ]
  }
}
```

## Beat Model Updates

### New Fields
```javascript
{
  pricingType: 'standard' | 'bidding',
  minBidPrice: Number,
  currentBid: Number,
  highestBidder: String (userId),
  bidHistory: Array,
  biddingEndDate: Date,
  trending: Boolean,
  platformCommissionRate: 0.125
}
```

### New Methods

#### switchPricingType(newType, minPrice, endDate)
Switch between standard and bidding pricing

#### placeBid(userId, bidAmount, username)
Place a bid on the beat

#### calculateCommission(amount)
Calculate platform commission breakdown

#### getFinalPrice()
Get the final sale price (considers current bid if applicable)

## Bidding Rules

### Minimum Bid Increment
- First bid: Must meet minimum bid price
- Subsequent bids: Must be at least 5% higher than current bid
- Example: If current bid is $100, next bid must be at least $105

### Auction Duration
- Default: 7 days
- Customizable by seller (1-30 days)
- Cannot be extended once started
- Countdown timer shows time remaining

### Bid Restrictions
- Users cannot bid on their own beats
- Users can place multiple bids (outbidding themselves)
- All bids are final and binding
- Bidding ends automatically at specified end date

### Winner Determination
- Highest bid at auction end time wins
- Winner receives notification
- Payment processing initiates automatically
- Seller receives payment minus 12.5% commission

## Commission Payment Flow

### 1. Transaction Occurs
```
Buyer pays: $100.00
```

### 2. Commission Calculated
```
Platform commission: $12.50 (12.5%)
Seller earnings: $87.50
```

### 3. Payment Split
```
Platform account: +$12.50
Seller account: +$87.50
```

### 4. Earnings Display
```
Seller Dashboard Shows:
- Gross Sale: $100.00
- Platform Commission: -$12.50
- Net Earnings: $87.50
```

## Frontend UI Components

### Beat Card Updates
Beat cards now display:
- Pricing type badge ("Standard" or "Auction")
- For auctions:
  - Current bid amount
  - Time remaining
  - Total number of bids
  - "Place Bid" button
- For trending beats:
  - Trending badge/icon
  - Option to switch pricing type (seller only)

### Bidding Modal
When user clicks "Place Bid":
1. Show current bid and minimum next bid
2. Input field for bid amount
3. Bid history (recent bids)
4. Time remaining
5. "Place Bid" button
6. Real-time updates via WebSocket

### Seller Dashboard
Sellers can:
- View all their beats
- Mark beats as trending
- Switch pricing types for trending beats
- Set minimum bid prices
- Set auction durations
- View bid history
- See commission breakdown on each sale

## Commission Transparency

### Buyer View
- Sees total purchase price
- No separate commission display (included in price)
- Clear pricing throughout checkout

### Seller View
- Sees gross sale amount
- Sees platform commission (12.5%)
- Sees net earnings
- Monthly commission totals
- Commission breakdown per transaction

## Analytics Integration

### Seller Analytics
- Total sales revenue
- Total platform commissions paid
- Average commission per sale
- Net earnings trends
- Comparison: Standard vs. Bidding sales performance

### Platform Analytics
- Total commission revenue
- Average commission per transaction
- Commission trends over time
- Most profitable categories
- Bidding vs. standard pricing performance

## Best Practices

### For Sellers

#### When to Use Standard Pricing
- Quick sales needed
- Established pricing for your brand
- Beats with proven market value
- Consistent income preferred

#### When to Use Bidding
- Beat is trending/popular
- Unique or exclusive beat
- Want to maximize value
- Can wait for auction to complete
- Expect competitive interest

### Pricing Strategy Tips
1. Start with standard pricing for new beats
2. Monitor engagement (plays, likes)
3. If beat becomes trending, consider bidding
4. Set minimum bid at or above original price
5. Choose auction duration strategically (weekdays vs weekends)

## Error Handling

### Common Errors

**Switching to Bidding - Not Trending**
```json
{
  "error": "Only trending beats can be switched to bidding mode"
}
```

**Bid Too Low**
```json
{
  "error": "Bid must be at least $105.00"
}
```

**Auction Ended**
```json
{
  "error": "Bidding has ended for this beat"
}
```

**Self-Bidding**
```json
{
  "error": "You cannot bid on your own beat"
}
```

## WebSocket Events

### Real-Time Bidding Updates
```javascript
// New bid placed
socket.on('new_bid', (data) => {
  console.log('New bid:', data.currentBid);
  console.log('Bidder:', data.username);
  console.log('Time:', data.timestamp);
});

// Auction ending soon (5 minutes warning)
socket.on('auction_ending', (data) => {
  console.log('Auction ends in 5 minutes:', data.beatId);
});

// Auction ended
socket.on('auction_ended', (data) => {
  console.log('Winner:', data.winner);
  console.log('Final price:', data.finalPrice);
});
```

## Future Enhancements

### Planned Features
1. **Auto-bidding**: Set maximum bid and let system bid automatically
2. **Bid Notifications**: Push notifications for outbid alerts
3. **Reserve Price**: Hidden minimum price seller will accept
4. **Buy Now Option**: Option to buy immediately at higher price during auction
5. **Bid Increments**: Customizable increment percentages
6. **Extended Bidding**: Automatic time extension if bid in last minutes
7. **Bidding Analytics**: Detailed bidding pattern analysis
8. **Bulk Pricing Changes**: Change multiple beats to bidding at once

### Commission Adjustments
- Tiered commission rates based on seller performance
- Volume discounts for high-volume sellers
- Premium seller program with reduced commission
- Promotional periods with reduced platform fees

## Support and Documentation

### For Sellers
- Commission calculator tool
- Pricing strategy guide
- Bidding optimization tips
- Success stories and case studies

### For Buyers
- How to bid guide
- Bidding best practices
- Understanding auction mechanics
- Payment and commission FAQ

## Compliance

### Financial Transparency
- All commission rates clearly disclosed
- Commission breakdown on every transaction
- No hidden fees
- Regular commission reports available

### Legal Considerations
- Terms of Service updated to include bidding rules
- Commission structure in seller agreement
- Buyer protection policies
- Auction cancellation policies

## Technical Implementation Notes

### Database Schema Updates
```sql
-- Add columns to beats table
ALTER TABLE beats ADD COLUMN pricing_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE beats ADD COLUMN min_bid_price DECIMAL(10,2);
ALTER TABLE beats ADD COLUMN current_bid DECIMAL(10,2);
ALTER TABLE beats ADD COLUMN highest_bidder VARCHAR(255);
ALTER TABLE beats ADD COLUMN bid_history JSON;
ALTER TABLE beats ADD COLUMN bidding_end_date TIMESTAMP;
ALTER TABLE beats ADD COLUMN trending BOOLEAN DEFAULT FALSE;

-- Add commission tracking to transactions
ALTER TABLE transactions ADD COLUMN platform_commission DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN seller_earnings DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN pricing_type VARCHAR(20);
```

### Cron Jobs/Scheduled Tasks
```javascript
// Check for ended auctions every minute
schedule.cron('* * * * *', async () => {
  const endedAuctions = await findEndedAuctions();
  endedAuctions.forEach(processAuctionEnd);
});

// Send auction ending warnings (5 min before)
schedule.cron('* * * * *', async () => {
  const endingSoon = await findAuctionsEndingSoon(5);
  endingSoon.forEach(sendEndingWarning);
});
```

## Testing Checklist

- [ ] Standard purchase with commission calculation
- [ ] Switch trending beat to bidding
- [ ] Place multiple bids with increments
- [ ] Prevent self-bidding
- [ ] Auction end time enforcement
- [ ] Winner determination
- [ ] Commission deduction on payout
- [ ] Earnings dashboard accuracy
- [ ] Real-time bid updates via WebSocket
- [ ] Commission transparency in UI
- [ ] Error handling for all scenarios
- [ ] Mobile responsive bidding interface

---

**Last Updated**: February 1, 2026
**Version**: 1.0.0
**Author**: Demond Balentine
