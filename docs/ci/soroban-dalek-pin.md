# Soroban dependency pin

CI no longer runs `cargo tree -i ed25519-dalek@3.0.0`.

That step was a temporary, non-blocking investigation into which crate pulled `ed25519-dalek` 3.0.0. The required check is the pin to 2.2.0 in `.github/workflows/ci.yml`, which keeps the Soroban test build on the compatible 2.x line.
