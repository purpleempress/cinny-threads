pub fn is_allowed_external_url(url: &str) -> bool {
    let Some((scheme, remainder)) = url.split_once(':') else {
        return false;
    };

    if remainder.is_empty() {
        return false;
    }

    matches!(
        scheme.to_ascii_lowercase().as_str(),
        "http" | "https" | "matrix" | "mailto"
    )
}

#[cfg(test)]
mod tests {
    use super::is_allowed_external_url;

    #[test]
    fn allows_expected_external_schemes() {
        assert!(is_allowed_external_url(
            "https://matrix.to/#/@user:example.org"
        ));
        assert!(is_allowed_external_url("http://example.org"));
        assert!(is_allowed_external_url("matrix:r/example.org/room"));
        assert!(is_allowed_external_url("mailto:user@example.org"));
    }

    #[test]
    fn rejects_executable_and_local_schemes() {
        assert!(!is_allowed_external_url("javascript:alert(1)"));
        assert!(!is_allowed_external_url("file:///etc/passwd"));
        assert!(!is_allowed_external_url("data:text/html,payload"));
        assert!(!is_allowed_external_url(
            "cytale://callback?loginToken=secret"
        ));
        assert!(!is_allowed_external_url("httpsx://example.org"));
        assert!(!is_allowed_external_url("not-a-url"));
    }
}
