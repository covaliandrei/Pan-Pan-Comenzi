# Pan Pan Comenzi - Firestore Security Specification

## 1. Data Invariants
- **User Identity & Roles**: A user cannot assign themselves the 'admin' or 'production' role on sign up unless permitted by an existing admin or initial bootstrap (user email `covali.andrei.box@gmail.com`). Users can only read and update their own profile.
- **Product Catalog**: Authenticated users (clients, production, admin) can read active products. Only managers/admins can create, update, or delete products.
- **Order Lifecycle**:
  - State progression follows: `creat` -> `confirmat` -> `inchis`.
  - Clients can create orders for themselves (`clientId == request.auth.uid`), edit orders while `state == 'creat'`, delete orders while `state == 'creat'`, and confirm them (`creat` -> `confirmat`).
  - Production staff can read orders for processing, update items (picked quantities), and change state from `confirmat` to `inchis`.
  - Clients cannot change orders once `state` is `confirmat` or `inchis`.
  - Only managers/admins can delete orders in any state or modify orders unrestricted.
  - Delivery date must be formatted and valid.

## 2. The "Dirty Dozen" Payloads
1. **Ghost Admin Escalation**: A newly registered client sends `{ role: 'admin' }` to `/users/{userId}` to gain manager privileges. (Must be REJECTED)
2. **Order Impersonation**: Client A submits an order with `clientId: "user_B_uid"`. (Must be REJECTED)
3. **Cross-Tenant List Snooping**: Client A runs a query without `where('clientId', '==', clientA.uid)` attempting to list Client B's orders. (Must be REJECTED)
4. **State Shortcutting to Closed**: Client attempts to set order status directly from `creat` to `inchis` without production picking. (Must be REJECTED)
5. **Post-Confirmation Client Tampering**: Client attempts to update order quantity or delivery date after status has reached `confirmat`. (Must be REJECTED)
6. **Unauthorized Order Deletion by Client**: Client attempts to delete an order that has already been `confirmat` or `inchis`. (Must be REJECTED)
7. **Production Unauthorized Price Alteration**: Production user attempts to edit product base prices in `/products/{productId}`. (Must be REJECTED)
8. **Unauthenticated Read of Orders**: Unauthenticated request attempting to read `/orders`. (Must be REJECTED)
9. **Payload Oversize Injection**: Malicious user injects a 500KB string into `orderNumber` or `notes`. (Must be REJECTED)
10. **Product Creation by Non-Admin**: Client or production user attempts to insert a new product document. (Must be REJECTED)
11. **Production Staff Self-Assignment to Admin**: Production staff writes an entry to `/admins/{uid}`. (Must be REJECTED)
12. **Tampering with Closed Orders**: Production staff attempts to alter an order whose state is already `inchis`. (Must be REJECTED)
