//! Automatic Differentiation module
//! 
//! Provides dual number implementation for forward-mode automatic differentiation.
//! This enables exact calculation of derivatives (Greeks) without numerical approximation.

pub mod dual;
pub mod ops;

pub use dual::Dual;
pub use ops::{erf, norm_cdf, norm_pdf};
