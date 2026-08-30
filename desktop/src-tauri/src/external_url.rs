pub fn is_allowed_external_url(url: &str) -> bool {
    let Some((scheme, remainder)) = url.split_once(':') else {
        return false;
    };

    if remainder.is_empty() {
        return false;
    }

    matches!(
        scheme.to_ascii_lowercase().as_str(),
        "http" | "https" | "matrix" | "mailto" | "tel"
    )
}

pub fn is_local_frontend_url(url: &str, port: u16) -> bool {
    for origin in [
        format!("http://localhost:{port}"),
        "tauri://localhost".to_string(),
        "http://tauri.localhost".to_string(),
        "https://tauri.localhost".to_string(),
    ] {
        if let Some(remainder) = url.strip_prefix(&origin) {
            return remainder.is_empty()
                || remainder.starts_with('/')
                || remainder.starts_with('?')
                || remainder.starts_with('#');
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::{is_allowed_external_url, is_local_frontend_url};

    #[test]
    fn allows_expected_external_schemes() {
        assert!(is_allowed_external_url(
            "https://matrix.to/#/@user:example.org"
        ));
        assert!(is_allowed_external_url("http://example.org"));
        assert!(is_allowed_external_url("matrix:r/example.org/room"));
        assert!(is_allowed_external_url("mailto:user@example.org"));
        assert!(is_allowed_external_url("tel:+441234567890"));
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

    #[test]
    fn recognises_only_the_bundled_frontend_origins_as_local() {
        assert!(is_local_frontend_url(
            "http://localhost:44548/?app-version=test",
            44548
        ));
        assert!(is_local_frontend_url("tauri://localhost/", 44548));
        assert!(is_local_frontend_url(
            "http://tauri.localhost/settings",
            44548
        ));

        assert!(!is_local_frontend_url(
            "http://localhost:44549/?app-version=test",
            44548
        ));
        assert!(!is_local_frontend_url(
            "http://localhost:44548.evil.example/",
            44548
        ));
        assert!(!is_local_frontend_url("https://cinny.in", 44548));
    }
}
