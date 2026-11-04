from main import Deck

deck = Deck(["A", "K", "Q", "J", "10"])
print("size:", len(deck))
print("first and last:", deck[0], deck[-1])
print("slice:", deck[1:3])
print("iteration:", [card for card in deck])
print("contains Q:", "Q" in deck)
print("reversed:", list(reversed(deck)))
