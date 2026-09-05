// move/escrow/sources/payment_escrow.move

/// A minimal escrow contract for Sui.
///
/// Sender locks a coin for a named recipient. The recipient claims it with
/// `release`; the sender can reclaim it with `cancel` any time before that.
/// Generic over `Coin<T>` — works with SUI, USDC, or any other coin type.
module escrow::payment_escrow {
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::address;

    // ─── Errors ────────────────────────────────────────────────────────────

    /// Only the sender can cancel the escrow.
    const ENotSender: u64 = 0;

    /// Only the recipient can release the escrow.
    const ENotRecipient: u64 = 1;

    /// The escrow has already been claimed or cancelled.
    const EAlreadySettled: u64 = 2;

    // ─── Structs ──────────────────────────────────────────────────────────

    /// An escrow holding a `Coin<T>` for a specific recipient.
    struct Escrow<phantom T> has key, store {
        id: UID,
        sender: address,
        recipient: address,
        /// The amount of coins locked (in MIST / smallest unit).
        amount: u64,
    }

    // ─── Public entry functions ──────────────────────────────────────────

    /// Create a new escrow: sender locks `coin` for `recipient`.
    /// The `coin` is moved into the escrow object. The escrow object is
    /// sent to the sender (so they can cancel it later if needed).
    public entry fun create_escrow<T>(
        coin: Coin<T>,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let amount = coin::value(&coin);
        let escrow = Escrow<T> {
            id: object::new(ctx),
            sender,
            recipient,
            amount,
        };
        // Store the coin inside the escrow.
        transfer::transfer(coin, object::uid_to_address(&escrow.id));
        // The escrow object itself goes to the sender.
        transfer::transfer(escrow, sender);
    }

    /// Release the escrow to the recipient.
    /// Only the `recipient` address can call this.
    /// The escrow object is destroyed and the coin is sent to the recipient.
    public entry fun release<T>(
        escrow: Escrow<T>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.recipient, ENotRecipient);

        let Escrow { id, sender: _, recipient: _, amount: _ } = escrow;
        let coin = coin::take<T>(&mut object::borrow_uid_mut(&id));
        transfer::transfer(coin, sender);
        object::delete(id);
    }

    /// Cancel the escrow: sender reclaims the coin.
    /// Only the `sender` address can call this.
    public entry fun cancel<T>(
        escrow: Escrow<T>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.sender, ENotSender);

        let Escrow { id, sender: _, recipient: _, amount: _ } = escrow;
        let coin = coin::take<T>(&mut object::borrow_uid_mut(&id));
        transfer::transfer(coin, sender);
        object::delete(id);
    }

    // ─── View functions ──────────────────────────────────────────────────

    /// Read the amount of coin locked in the escrow (in MIST / smallest unit).
    public fun amount<T>(escrow: &Escrow<T>): u64 {
        escrow.amount
    }

    /// Read the sender address.
    public fun sender<T>(escrow: &Escrow<T>): address {
        escrow.sender
    }

    /// Read the recipient address.
    public fun recipient<T>(escrow: &Escrow<T>): address {
        escrow.recipient
    }
}