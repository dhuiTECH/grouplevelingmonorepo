# Comprehensive Guide: Porting Shop System to React Native Expo

This guide details how to port the **ShopView.tsx** component and its related functionality (including the Gacha system and normal shop interactions) to React Native Expo.

---

## Part 1: Overall Structure and Data Flow

### Component Analysis
The `ShopView` is a complex dashboard divided into three main operational modes, controlled by the `activeMainTab` state:
1.  **Hunter's Shop:** The default view for buying equipment (weapons, armor, accessories) and cosmetics (avatars, backgrounds). It uses a secondary filter tab system.
2.  **Magic Shop:** A specialized view for buying "magic effects" (auras) with different currency logic (often gems).
3.  **Gacha System:** A separate screen (`GachaScreen` component) for randomized item summoning.

### Props and State
*   **Props:**
    *   `user`: The core user object (contains `coins`, `gems`, `cosmetics`, `level`, `current_class`).
    *   `shopItems`: The master list of all purchasable items.
    *   `setUser`: Function to update the local user state (crucial for updating balances immediately after purchase/summon).
    *   `handleBuyItem`: The parent function that executes the transaction logic.
*   **State:**
    *   `activeMainTab`: `'hunter' | 'magic' | 'gacha'` - Controls the top-level view.
    *   `activeShopTab`: `'all' | 'weapons' | ...` - Filters items within the Hunter tab.
    *   `selectedShopItem`: Stores the item object to display in the "Details Modal".
    *   `isSummoning` / `summonResult`: Manages the loading state and result display for the Gacha system.

### Item Filtering Logic (`getFilteredShopItems`)
This function is the core of the display logic:
1.  **Ownership Check:** It creates a list of IDs from `user.cosmetics`. If an item is in this list, it is excluded (items are unique/one-time purchase).
2.  **Gacha Exclusion:** Items marked `is_gacha_exclusive` are hidden from the normal shop tabs.
3.  **Tab Filtering:**
    *   If `activeShopTab` is 'all', it sorts items by `is_featured`.
    *   Otherwise, it filters by the `slot` property (e.g., 'weapon', 'body', 'accessory').

---

## Part 2: Main Shop Layout (Header and Category Tabs)

### Header Elements
The web version uses a "card" style header (`aura-card-gradient`) to show the shop title and user currencies.
*   **React Native Port:** Use a `LinearGradient` (from `expo-linear-gradient`) as the container background.
*   **Currency Display:** Use a `View` with `row` direction. Use `Image` for icons and `Text` for values.

### Main Tabs ('Hunter', 'Magic', 'Gacha')
Currently implemented as `<button>` elements with dynamic classes for active states.
*   **React Native Port:**
    *   Use `TouchableOpacity` for the tab container.
    *   Style with `flexDirection: 'row'` to align icon and text.
    *   **Active State:** Change `borderColor` and `backgroundColor` based on `activeMainTab === 'tabName'`.
    *   **Icons:** Use `Image` with `resizeMode="contain"`.

### Shop Category Tabs (Hunter Shop)
These are smaller buttons that filter the grid.
*   **React Native Port:**
    *   Use a `ScrollView` with `horizontal={true}` to allow scrolling if there are many categories.
    *   Render `TouchableOpacity` items.
    *   **Styling:** Differentiate active vs. inactive using conditional styles (e.g., `backgroundColor: '#ca8a04'` for active).

---

## Part 3: Shop Item Grid Display

### Grid Structure
The web uses CSS Grid (`grid-cols-4`).
*   **React Native Port:**
    *   Use **`FlatList`**.
    *   Set `numColumns={2}` (or 3 depending on screen width).
    *   Use `columnWrapperStyle` to manage spacing between columns.
    *   **Important:** `FlatList` doesn't support a `ScrollView` parent easily. If the whole screen scrolls, consider using a normal `View` with `flexWrap: 'wrap'` inside a main `ScrollView`, OR use `FlatList` as the main scroll container and put headers in `ListHeaderComponent`.

### Individual Item Card
*   **Structure:**
    ```tsx
    <TouchableOpacity style={styles.card} onPress={() => setSelectedShopItem(item)}>
      <View style={styles.badgesContainer}>
        {/* Level/Class Badges using absolute positioning */}
      </View>
      <View style={styles.imageContainer}>
        {/* Radiating Energy (View with absolute pos + opacity) */}
        <ShopItemMedia item={item} />
      </View>
      <Text style={styles.itemName}>{item.name}</Text>
      <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
        <Text>Price</Text>
      </TouchableOpacity>
    </TouchableOpacity>
    ```
*   **ShopItemMedia:** You likely already have this ported. Ensure it handles `resizeMode="contain"`.

### Styling and Interactivity
*   **Rarity Glow:** Create a helper function `getRarityColor(rarity)` that returns hex codes. Use this for `borderColor` and `shadowColor`.
*   **Badges:** Use small `View`s with `position: 'absolute'` inside the card.
*   **Buy Button:** Needs `e.stopPropagation()` equivalent? In RN, if the Buy button is a child of the Card Touchable, pressing it *might* bubble. It's usually better to have the Buy button separate or ensure the hit slop is clear. However, the modal flow (click card -> open details -> buy) is often better for mobile than a direct "Buy" button on the grid, to prevent accidental purchases.

---

## Part 4: Normal Shop Item Details Pop-up Modal

### Modal Structure and Data
This is a standard overlay that shows more details than the small card.
*   **React Native Port:**
    *   Use the **`Modal`** component from React Native.
    *   `transparent={true}` and `animationType="fade"`.
    *   **Backdrop:** A `View` with `flex: 1`, `backgroundColor: 'rgba(0,0,0,0.8)'`, and `justifyContent: 'center'`.
    *   **Content:** A generic `View` (the "card") centered in the backdrop.

### Display Logic
*   **Visibility:** `visible={!!selectedShopItem}`.
*   **Close:** `onRequestClose={() => setSelectedShopItem(null)}` (Android back button) and a clear "Close" button inside the modal.

### Styling Details
*   **Rarity Colors:** Apply dynamic text colors to the Name and Rarity label.
*   **Requirements:** Render the "Min Level" and "Class Req" sections using `View` rows. Compare `user.level` vs `item.min_level` to conditionally color the text (Red vs Green/Cyan).
*   **Description:** Use a `Text` component with `textAlign: 'center'`.

---

## Part 5: Data Integration and Actions

### Purchase Initiation
The `handleBuyItem` function is passed from the parent screen.
*   **React Native Integration:**
    *   In your `ShopScreen.tsx` (the parent), define `handleBuyItem`.
    *   **API Call:**
        ```typescript
        const handleBuyItem = async (item: ShopItem, currency: 'coins' | 'gems' = 'coins') => {
          // 1. Optimistic Check
          if (user[currency] < item.price) {
            Alert.alert("Insufficient Funds");
            return;
          }

          try {
            // 2. Call API
            const { data, error } = await supabase.rpc('purchase_item', { 
              item_id: item.id, 
              user_id: user.id 
            }); 
            // OR fetch('/api/shop/purchase', ...) if using Next.js backend logic

            if (error) throw error;

            // 3. Update Local State
            setUser({ 
              ...user, 
              [currency]: user[currency] - item.price,
              cosmetics: [...user.cosmetics, { ...newCosmetic }] 
            });
            Alert.alert("Success", `Purchased ${item.name}!`);
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        };
        ```

---

## Part 6: General React Native Considerations

### Responsive Styling
*   **Grid:** Use `Dimensions.get('window').width` to calculate card width.
    *   Example: `const cardWidth = (screenWidth - (gap * numColumns)) / numColumns;`
*   **Text:** Use responsive font sizes or standard scale helpers if you have them.

### Navigation
*   The **Gacha** section is currently a tab. If it becomes too complex, you might want to move it to a separate screen in the stack (`navigation.navigate('Gacha')`) instead of a conditional render. However, keeping it as a tab (conditional render) preserves the "Shop" context well.

### State Management
*   **Local State (`useState`)** is sufficient for the UI tabs and selected item.
*   **User Data:** Rely on your `useAuth` or `useGameData` hook to provide the single source of truth for the `user` object. Do *not* duplicate user balance logic inside the view if possible; update the context.

---

## Summary of Files to Create/Update
1.  **`src/components/ShopView.tsx`**: The main component implementing the structure above.
2.  **`src/screens/ShopScreen.tsx`**: The container screen that fetches data and passes it to `ShopView`.
3.  **`src/components/GachaScreen.tsx`**: (If not already ported) The sub-component for the Gacha tab.

This plan gives you a solid roadmap to move from the web-based `div` structure to a native, performant mobile layout!
