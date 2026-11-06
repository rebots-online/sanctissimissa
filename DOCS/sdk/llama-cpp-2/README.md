<!--
SNAPSHOT  DOCS/sdk/llama-cpp-2/README.md
source:   https://github.com/utilityai/llama-cpp-rs/blob/0.1.156/llama-cpp-2/README.md
fetched:  2026-11-06 (crate tarball (static.crates.io), verbatim)
version:  llama-cpp-2 0.1.156 (matches src-tauri/Cargo.toml pin) / llama-cpp-sys-2 0.1.156; git tag 0.1.156 = 63e549708237b16b39018288582655539e0a9d5b
license:  MIT OR Apache-2.0

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/llama-cpp-2/INDEX.md instead.
-->

# llama-cpp-rs-2

[utilityai]: https://utilityai.ca

A wrapper around the [llama-cpp](https://github.com/ggerganov/llama.cpp/) library for rust.

# Info

This is part of the project powering all the LLMs at [utilityai], it is tightly coupled llama.cpp and mimics its API as
closly as possible while being safe in order to stay up to date.

# Dependencies

This uses bindgen to build the bindings to llama.cpp. This means that you need to have clang installed on your system.

If this is a problem for you, open an issue, and we can look into including the bindings. 

See [bindgen](https://rust-lang.github.io/rust-bindgen/requirements.html) for more information.

# Disclaimer

This crate is *not safe*. There is absolutly ways to misuse the llama.cpp API provided to create UB, please create an issue if you spot one. Do not use this code for tasks where UB is not acceptable.

This is not a simple library to use. In an ideal world a nice abstraction would be written on top of this crate to
provide an ergonomic API - the benefits of this crate over raw bindings is safety (and not much of it as that) and not much else.

We compensate for this shortcoming (we hope) by providing lots of examples and good documentation. Testing is a work in
progress.

# Contributing

Contributions are welcome. Please open an issue before starting work on a non-trivial PR.
