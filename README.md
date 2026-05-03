# 🍪 Cookie Fundraiser Website

A simple, beautiful order form website for a homemade cookie fundraiser. Built with plain HTML, CSS, and JavaScript — no frameworks, no build tools, no npm. Just upload and go.

---

## Quick Start

### 1. Update your payment info

Open `app.js` and find the `PAYMENT_CONFIG` section near the top:

```js
const PAYMENT_CONFIG = {
  cashapp: {
    handle: '$YourCashtag',           // ← change this
    link:   'https://cash.app/$YourCashtag'   // ← change this
  },
  venmo: {
    handle: '@YourVenmo',             // ← change this
    link:   'https://venmo.com/YourVenmo'     // ← change this
  },
  email: 'sharonscookiessupreme@gmail.com'    // ← change this
};
```

### 2. Edit your cookies

Still in `app.js`, find the `COOKIES` array. Each cookie looks like this:

```js
{
  id: 1,
  name: 'Spring Swirl',
  occasions: ['Teacher Appreciation', "Mother's Day"],
  desc: 'Vanilla bean cookie with rose-pink buttercream swirl.',
  emoji: '🌸',
  imageSrc: '',        // ← add 'images/spring-swirl.jpg' when you have photos
  price: 15,
  stock: 20,           // ← max orders you'll accept
  size: '6"×6"',
  topper: 'Spring Flower'
}
```

Add, remove, or edit entries as needed. Occasions must be one of:
- `'Teacher Appreciation'`
- `"Mother's Day"`
- `'Graduation'`

### 3. Add real photos (when ready)

1. Create an `images/` folder in the project
2. Add your cookie photos (JPG or PNG, ideally square or landscape)
3. Set `imageSrc: 'images/your-photo.jpg'` on the matching cookie in `app.js`

---

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `cookie-fundraiser`)
2. Upload all three files: `index.html`, `style.css`, `app.js`
3. Go to **Settings → Pages**
4. Under "Source", select **Deploy from a branch → main → / (root)**
5. Click Save — your site will be live at `https://yourusername.github.io/cookie-fundraiser/`

---

## File Structure

```
cookie-fundraiser/
├── index.html    ← page structure
├── style.css     ← all styling
├── app.js        ← data, logic, and interactivity
└── images/       ← create this folder when you have photos
    └── (your cookie photos)
```

---

## Features

- Filter cookies by occasion (Teacher Appreciation, Mother's Day, Graduation)
- Add to cart with name, email, quantity, topper, and notes
- Live inventory tracking — cards show "Only 3 left!" or "Sold out"
- Order success screen with direct Cashapp/Venmo/Zelle payment links
- **⚙ Inventory** button (bottom-right) to update max orders per cookie
- Fully responsive — works on mobile

---

## Notes

- Orders and inventory reset when the browser is refreshed (this is a static site with no backend database)
- For persistent order tracking, consider connecting a Google Form submission to a Google Sheet as a lightweight backend, or use a service like Formspree
- Payment is handled outside the site — buyers pay you directly via Cashapp/Venmo/Zelle
