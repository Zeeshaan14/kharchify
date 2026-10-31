# iPhone Shortcut: log an expense after Google Pay

After you leave Google Pay, your iPhone asks how much you spent and the category, and saves it to Kharchify.

```
Close Google Pay → number pad: 250 → pick 🍔 food → alert: "✅ ₹250 added to Food"
```
With a monthly budget set (`POST /budgets`), the alert also says what's left: `✅ ₹250 added to Food · ₹3,200 left this month`.
Didn't pay anything? Tap **Cancel** on the amount prompt — nothing is sent.

Written for **iOS 27** (no *Ask for Input* action; *Choose from List* on a dictionary returns the **value**, not the key). Needs the backend deployed ([DEPLOY.md](DEPLOY.md)) — API URL `https://<your-project>.vercel.app`.

---

## Step 1 — Create a personal API token

Use the **live** docs page, `https://<your-project>.vercel.app/docs`. A token or category id made on a laptop server with its own database (e.g. the default SQLite) doesn't exist on the live server.

1. **POST /auth/register** (first time only) → *Try it out* → your email, name, password.
2. Click **Authorize** (top right) → email in *username*, your password → Authorize.
3. **POST /tokens** → body `{"name": "iPhone Shortcut"}` → Execute.
4. From the **Response body**, copy the `token` value (starts with `kh_`, ~45 characters — not the 10-character `prefix`). **It is shown only once.**
5. **GET /categories** → Execute → note the `id` of each category you want in the Shortcut.

If the token is ever leaked or your phone is lost: **DELETE /tokens/{id}** — the Shortcut stops working immediately.

## Step 2 — Build the Shortcut

Shortcuts app → **Shortcuts** tab → **+** → name it **Log Expense**. Tapping an action in the search bar adds it at the **bottom**, so add these in order and nothing needs dragging. The ✕ on a card deletes that action (and, for menus, everything inside it) — there may be no undo.

1. **Number** → tap the value → **Ask Each Time**. This is the amount prompt (shows the number pad; it is labelled "Number" — iOS 27 doesn't allow a custom prompt here).
2. **Dictionary** → **Add new item** → **Text** for each category. Key = what you see in the list, value = the category `id` from Step 1:
   | Key | Value |
   |---|---|
   | `🍔 food` | `1` |
   | `🛒 groceries` | `2` |
   | `🚕 transport` | `3` |
   | `🛍️ shopping` | `4` |
   | `🧾 bills` | `5` |
   | `📦 others` | `10` |

   (Example ids — use yours.)
3. **Choose from List** → it shows as *Choose from **Dictionary***. Prompt `Category`. Keep **Select Multiple** off. Its output, **Selected Item**, is already the category id.
4. **Get Contents of URL** → URL `https://<your-project>.vercel.app/expenses` (https, no trailing slash) → expand:
   - Method **POST**
   - Headers: `Authorization` = `Bearer kh_…your token…` (one space after `Bearer`)
   - Request Body **JSON** → add two **Text** fields:
     | Key | Value (Select Variable) |
     |---|---|
     | `amount` | **Number** |
     | `category_id` | **Selected Item** |
5. **Get Dictionary Value** → *Get **Value** for `message` in **Contents of URL***.
6. **Show Alert** → **Dictionary Value**, **Show Cancel Button** off.

Final shape:
```
Number (Ask Each Time)
Dictionary (label → category id)
Choose from Dictionary
Get contents of URL   POST /expenses  {amount: Number, category_id: Selected Item}
Get Value for message in Contents of URL
Show alert Dictionary Value
```

Run it once with ▶ (amount `1`). The first time, iOS asks to allow connecting to your API — choose **Always Allow**. Then delete the test entry with **DELETE /expenses/{id}** in `/docs`.

## Step 3 — Run it automatically after Google Pay

Shortcuts → **Automation** tab → **+** → **App** → **Google Pay** → **Is Closed** (not *Is Opened*) → **Run Immediately**, *Notify When Run* off → action **Run Shortcut** → **Log Expense**.

Keep the automation to that single action; all logic stays in *Log Expense*, so you can also run it by hand. "Closed" means you leave the app (go home or switch apps), not force-quit.

## Extras
- **More categories:** add a row to the Dictionary (label → id from **GET /categories**).
- **Cash spending:** add *Log Expense* to your Home Screen (share ▸ *Add to Home Screen*) or **Settings → Accessibility → Touch → Back Tap**.
- **Default payment method** is UPI. For a cash version, duplicate the shortcut and add a JSON field `payment_method` = `cash`.

## Troubleshooting
The alert is **empty** when the server returned an error (there's no `message`), so the expense was **not** saved. To see the error, temporarily set Show Alert to **Contents of URL**:

| Response | Fix |
|---|---|
| `Invalid or expired token` / `Not authenticated` | Token incomplete, from the laptop server, or revoked; or `Bearer ` missing — create a new one on the live `/docs` (Step 1). |
| `category_id` … `"input": ""` | `category_id` isn't set to **Selected Item**, or a Get Dictionary Value lookup was put between — the selection already is the id. |
| `Category not found` | The id doesn't exist on the live server — re-check **GET /categories**. |
| `Category '…' is archived` | Un-archive it, or point that Dictionary row at another category. |
| `Method Not Allowed` / HTML page | URL wrong — must be `https://…/expenses`. |
| Timeout | The first request after a quiet period can take a few seconds — run again. |

**Security:** the token is stored inside the Shortcut. Don't share this Shortcut with anyone — they could add expenses to your account.
