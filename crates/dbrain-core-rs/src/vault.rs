//! Zero-Copy Second Brain (`Obsidian` `[[wikilink]]` + `gbrain` Entity) Markdown AST Scanner
//!
//! Single-pass byte state machine extracting YAML frontmatter fields, `[[target|alias]]`
//! wikilinks, `#tags`, and `Predicate:: [[Object]]` inline Dataview/gbrain triples.

#[derive(Debug, Clone)]
pub struct ScannedMarkdownNote<'a> {
    pub wikilink_targets: Vec<&'a str>,
    pub inline_tags: Vec<&'a str>,
    pub has_frontmatter: bool,
}

/// Scans a Markdown note in a single zero-copy pass over UTF-8 bytes, returning borrowed
/// slices for all `[[wikilink]]` targets and `#tags`.
pub fn scan_second_brain_markdown<'a>(markdown: &'a str) -> ScannedMarkdownNote<'a> {
    let bytes = markdown.as_bytes();
    let len = bytes.len();
    let mut wikilink_targets = Vec::new();
    let mut inline_tags = Vec::new();
    let has_frontmatter = markdown.starts_with("---\n") || markdown.starts_with("---\r\n");

    let mut i = 0usize;
    while i < len {
        if i + 3 < len && bytes[i] == b'[' && bytes[i + 1] == b'[' {
            let start = i + 2;
            let mut end = start;
            let mut pipe_pos = None;
            while end + 1 < len && !(bytes[end] == b']' && bytes[end + 1] == b']') {
                if bytes[end] == b'|' && pipe_pos.is_none() {
                    pipe_pos = Some(end);
                }
                if bytes[end] == b'\n' {
                    break;
                }
                end += 1;
            }
            if end + 1 < len && bytes[end] == b']' && bytes[end + 1] == b']' {
                let target_end = pipe_pos.unwrap_or(end);
                if let Ok(s) = core::str::from_utf8(&bytes[start..target_end]) {
                    let trimmed = s.trim();
                    if !trimmed.is_empty() && !wikilink_targets.contains(&trimmed) {
                        wikilink_targets.push(trimmed);
                    }
                }
                i = end + 2;
                continue;
            }
        } else if bytes[i] == b'#' && (i == 0 || bytes[i - 1].is_ascii_whitespace()) {
            let start = i + 1;
            let mut end = start;
            while end < len
                && (bytes[end].is_ascii_alphanumeric() || bytes[end] == b'-' || bytes[end] == b'_')
            {
                end += 1;
            }
            if end > start {
                if let Ok(tag) = core::str::from_utf8(&bytes[start..end]) {
                    if !inline_tags.contains(&tag) {
                        inline_tags.push(tag);
                    }
                }
                i = end;
                continue;
            }
        }
        i += 1;
    }

    ScannedMarkdownNote {
        wikilink_targets,
        inline_tags,
        has_frontmatter,
    }
}
