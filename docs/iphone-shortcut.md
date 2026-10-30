# iPhone Shortcut: log an expense after Google Pay

After you leave Google Pay, your iPhone asks how much you spent and the category, and saves it to Kharchify.

```
Close Google Pay → "How much did you spend?" 250 → pick 🍔 Food → note (optional)
→ notification: "✅ ₹250 added to Food"
```
Didn't pay anything? Tap **Cancel** on the first prompt — nothing is sent.

Needs: iOS 17+, and a Kharchify backend your phone can reach (see step 0).

---

## Step 0 — Make the backend reachable from your phone

**Recommended: deploy it** ([DEPLOY.md](DEPLOY.md)). Your API URL is then `https://<your-project>.vercel.app` and works anywhere, on Wi-Fi or mobile data — skip to Step 1.

**Alternative, testing at home only:** laptop and iPhone on the same Wi-Fi.

1. **Find the laptop's IP:** run `ipconfig` and use the **IPv4 Address** of your Wi-Fi/Ethernet adapter. Addresses below like `192.168.1.5` are only examples — use yours.
2. **Mark your home network as Private** (one time): Settings → Network & internet → your connection → *Network profile type* → **Private network**. Windows blocks incoming connections on Public networks. Only do this for your home network.
3. **Allow the port** (one time) — PowerShell **as Administrator**:
   ```powershell
   New-NetFirewallRule -DisplayName "Kharchify dev API (port 8000)" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
   ```
   (Remove later with `Remove-NetFirewallRule -DisplayName "Kharchify dev API (port 8000)"`.)
4. **Start the server** from `backend/` — `--host 0.0.0.0` is required, otherwise only the laptop can connect:
   ```
   .venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
5. **Test:** iPhone on the **same Wi-Fi** (not mobile data) → Safari → `http://<laptop IP>:8000/health` → should show `{"status":"ok"}`.

Your **API URL** is `http://<laptop IP>:8000`. The IP can change after a reboot — if the Shortcut stops connecting, re-check `ipconfig` (or reserve the IP in your router). After deployment it becomes the real `https://…` address — just update it in the Shortcut.

## Step 1 — Create a personal API token

Until the web app exists, use the API docs page:

1. Open `http://<API URL>/docs`.
2. **POST /auth/register** (first time only) → *Try it out* → your email, name, password.
3. Click **Authorize** (top right) → email in *username*, your password → Authorize.
4. **POST /tokens** → *Try it out* → body `{"name": "iPhone Shortcut"}` → Execute.
5. Copy the `token` value (starts with `kh_`). **It is shown only once.**

If the token is ever leaked or your phone is lost: **DELETE /tokens/{id}** — the Shortcut stops working immediately.

## Step 2 — Build the Shortcut

Shortcuts app → **Shortcuts** tab → **+** → name it **Log Expense**. Add these actions in order (search for each by name):

**Ask for the amount**
1. **Ask for Input** → type **Number**, prompt `How much did you spend?`
2. **Set Variable** → name `Amount`, input *Provided Input*

**Load your categories**
3. **Text** → `http://192.168.1.5:8000` (your API URL)
4. **Set Variable** → `API`
5. **Get Contents of URL** → URL: `API` variable + `/categories`
   - Method **GET**, Headers: `Authorization` = `Bearer kh_…your token…`
6. **Dictionary** → leave empty → **Set Variable** `Cats`
7. **Repeat with Each** item in *Contents of URL*:
   - **Get Dictionary Value** `id` in *Repeat Item* → **Set Variable** `CatId`
   - **Get Dictionary Value** `icon` in *Repeat Item* → **Set Variable** `CatIcon`
   - **Get Dictionary Value** `name` in *Repeat Item* → **Set Variable** `CatName`
   - **Set Dictionary Value** → key `CatIcon CatName` (both variables with a space), value `CatId`, in `Cats`
   - **Set Variable** `Cats` (to the updated dictionary)
   - *End Repeat*

**Pick category + note**
8. **Choose from List** → `Cats`, prompt `Category?`
9. **Get Dictionary Value** → *Chosen Item* in `Cats` → **Set Variable** `CategoryId`
10. **Ask for Input** → type **Text**, prompt `Note? (optional)` — leave it blank to skip

**Save it**
11. **Get Contents of URL** → URL: `API` + `/expenses`
    - Method **POST**
    - Headers: `Authorization` = `Bearer kh_…your token…`
    - Request Body **JSON**:
      | Key | Type | Value |
      |---|---|---|
      | `amount` | Number | `Amount` |
      | `category_id` | Number | `CategoryId` |
      | `note` | Text | *Provided Input* (from step 10) |
12. **Get Dictionary Value** `message` in *Contents of URL*
13. **If** *Dictionary Value* **has any value** → **Show Notification** *Dictionary Value*
    **Otherwise** → **Get Dictionary Value** `detail` in *Contents of URL* → **Show Notification** `Kharchify error: ` + *Dictionary Value*
    *End If*

Run it once with ▶ to test. The first time, iOS asks to allow connecting to your API address — choose **Always Allow**.

## Step 3 — Run it automatically after Google Pay

Shortcuts → **Automation** tab → **+** → **App**:
- App: **Google Pay** · tick **Is Closed** (untick *Is Opened*)
- Choose **Run Immediately**, turn off *Notify When Run*
- **Next** → select **Log Expense**

"Closed" means you leave the app (go home or switch apps), not force-quit.

## Extras
- **Cash spending:** add *Log Expense* to your Home Screen (share ▸ *Add to Home Screen*) or to **Settings → Accessibility → Touch → Back Tap**.
- **Default payment method** is UPI. For a cash version, duplicate the shortcut and add a JSON field `payment_method` = `cash`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Could not connect" / timeout | Using your real laptop IP (not the example)? Server running with `--host 0.0.0.0`? Network set to Private + firewall rule added (Step 0)? Same Wi-Fi? IP changed? Still failing → router "AP/client isolation" may be on. |
| `Kharchify error: Invalid or expired token` | Token mistyped or revoked — create a new one (Step 1). |
| `Category '…' is archived` | Un-archive it, or the list is stale — rerun. |
| Automation asks "Run?" every time | Some iOS versions require confirmation for app triggers; tap Run. |

**Security:** the token is stored inside the Shortcut. Don't share this Shortcut with anyone — they could add expenses to your account.
