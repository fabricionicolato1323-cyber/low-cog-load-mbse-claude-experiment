#!/bin/sh
# Sequential S3 sweep. Resumable (run.ts skips finished paragraphs).
for m in phi4-mini gemma3:4b qwen3.5:4b qwen3.5:9b; do
  node --import tsx src/run.ts --model "$m" --mode constrained
done
node --import tsx src/run.ts --model phi4-mini --mode unconstrained
