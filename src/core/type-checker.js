/**
 * Type checker for effector-graph.
 *
 * Delegates to @effectorhq/core for type compatibility checking.
 * Re-exports isTypeCompatible with precision scores for graph edge weighting.
 */

export { isTypeCompatible } from '../../../effector-core/src/type-checker.js';
