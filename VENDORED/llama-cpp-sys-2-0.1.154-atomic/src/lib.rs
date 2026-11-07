//! See [llama-cpp-2](https://crates.io/crates/llama-cpp-2) for a documented and safe API.

#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unpredictable_function_pointer_comparisons)]

include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

// ---------------------------------------------------------------------------
// SanctissiMissa vendoring patch (see PROVENANCE.md "Local patches").
//
// The Atomic fork (8d935078…) changed two sampler signatures relative to the
// llama.cpp pin of the 0.1.154 bridge (5f55650a…):
//   llama_sampler_init_penalties gained a leading `int32_t n_vocab`
//     (used only by the backend-sampling path; CPU sampling ignores it);
//   llama_sampler_init_dry dropped `int32_t n_ctx_train`.
// build.rs blocklists both from bindgen; these shims keep the exact
// llama-cpp-2 =0.1.154 call signatures and forward to the fork's ABI.
// ---------------------------------------------------------------------------

mod fork_abi {
    use super::{llama_sampler, llama_vocab};
    unsafe extern "C" {
        pub fn llama_sampler_init_penalties(
            n_vocab: i32,
            penalty_last_n: i32,
            penalty_repeat: f32,
            penalty_freq: f32,
            penalty_present: f32,
        ) -> *mut llama_sampler;
        pub fn llama_sampler_init_dry(
            vocab: *const llama_vocab,
            dry_multiplier: f32,
            dry_base: f32,
            dry_allowed_length: i32,
            dry_penalty_last_n: i32,
            seq_breakers: *mut *const ::std::os::raw::c_char,
            num_breakers: usize,
        ) -> *mut llama_sampler;
    }
}

/// 0.1.154-bridge signature; forwards with `n_vocab = 0` (CPU sampling path).
///
/// # Safety
/// Same contract as the C function `llama_sampler_init_penalties`.
pub unsafe fn llama_sampler_init_penalties(
    penalty_last_n: i32,
    penalty_repeat: f32,
    penalty_freq: f32,
    penalty_present: f32,
) -> *mut llama_sampler {
    unsafe { fork_abi::llama_sampler_init_penalties(0, penalty_last_n, penalty_repeat, penalty_freq, penalty_present) }
}

/// 0.1.154-bridge signature; `n_ctx_train` is no longer taken by the fork.
///
/// # Safety
/// Same contract as the C function `llama_sampler_init_dry`.
#[allow(clippy::too_many_arguments)]
pub unsafe fn llama_sampler_init_dry(
    vocab: *const llama_vocab,
    _n_ctx_train: i32,
    dry_multiplier: f32,
    dry_base: f32,
    dry_allowed_length: i32,
    dry_penalty_last_n: i32,
    seq_breakers: *mut *const ::std::os::raw::c_char,
    num_breakers: usize,
) -> *mut llama_sampler {
    unsafe {
        fork_abi::llama_sampler_init_dry(
            vocab,
            dry_multiplier,
            dry_base,
            dry_allowed_length,
            dry_penalty_last_n,
            seq_breakers,
            num_breakers,
        )
    }
}
