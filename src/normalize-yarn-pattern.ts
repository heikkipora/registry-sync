/*
BSD 2-Clause License

For Yarn software

Copyright (c) 2016-present, Yarn Contributors. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
// From https://github.com/yarnpkg/yarn/blob/953c8b6a20e360b097625d64189e6e56ed813e0f/src/util/normalize-pattern.js#L2

export function normalizeYarnPackagePattern(pattern: string): {
  hasVersion: boolean
  name: string
  range: string
} {
  let hasVersion = false
  let range = 'latest'
  let name = pattern

  // if we're a scope then remove the @ and add it back later
  let isScoped = false
  if (name[0] === '@') {
    isScoped = true
    name = name.slice(1)
  }

  // take first part as the name
  const parts = name.split('@')
  if (parts.length > 1) {
    name = parts.shift()!
    range = parts.join('@')

    if (range) {
      hasVersion = true
    } else {
      range = '*'
    }
  }

  // add back @ scope suffix
  if (isScoped) {
    name = `@${name}`
  }

  return {name, range, hasVersion}
}
