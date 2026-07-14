<?php
/**
 * Plugin Name: Antiwar.com Instant Publish
 * Description: Triggers a rebuild of the static antiwar.com front-end the moment a post is published. Configure under Settings → Instant Publish.
 * Version: 1.0.0
 * Author: Antiwar.com redesign project
 * License: MIT
 *
 * Install: upload this folder (or a zip of it) via Plugins → Add New → Upload Plugin,
 * activate, then enter your GitHub repository and token under Settings → Instant Publish.
 * No theme editing required.
 */

if (!defined('ABSPATH')) {
    exit;
}

const AIP_OPTION_REPO  = 'aip_github_repo';
const AIP_OPTION_TOKEN = 'aip_github_token';

/**
 * Fire the GitHub repository_dispatch event that triggers a site rebuild.
 *
 * @param bool $blocking Wait for the response (used by the test button).
 * @return array{ok: bool, message: string}
 */
function aip_trigger_rebuild($blocking = false)
{
    $repo  = trim((string) get_option(AIP_OPTION_REPO, ''));
    $token = trim((string) get_option(AIP_OPTION_TOKEN, ''));

    if ($repo === '' || $token === '') {
        return ['ok' => false, 'message' => 'Repository or token not configured.'];
    }

    $response = wp_remote_post("https://api.github.com/repos/{$repo}/dispatches", [
        'blocking' => $blocking,
        'timeout'  => $blocking ? 10 : 0.01,
        'headers'  => [
            'Authorization' => 'Bearer ' . $token,
            'Accept'        => 'application/vnd.github+json',
            'User-Agent'    => 'antiwar-instant-publish',
        ],
        'body' => wp_json_encode(['event_type' => 'publish']),
    ]);

    if (!$blocking) {
        return ['ok' => true, 'message' => 'Rebuild request sent.'];
    }

    if (is_wp_error($response)) {
        return ['ok' => false, 'message' => 'Request failed: ' . $response->get_error_message()];
    }

    $code = wp_remote_retrieve_response_code($response);

    // GitHub returns 204 No Content on success.
    if ($code === 204) {
        return ['ok' => true, 'message' => 'Success (HTTP 204). A rebuild is starting; the site updates in ~2–3 minutes.'];
    }

    return ['ok' => false, 'message' => "GitHub responded with HTTP {$code}. Check the repository name and token permissions (needs Contents: read & write on that one repo)."];
}

/**
 * Publish hook: fire on any post type going from not-published to published.
 */
add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if ($new_status !== 'publish' || $old_status === 'publish') {
        return;
    }
    aip_trigger_rebuild(false);
}, 10, 3);

/**
 * Settings page.
 */
add_action('admin_menu', function () {
    add_options_page(
        'Instant Publish',
        'Instant Publish',
        'manage_options',
        'aip-settings',
        'aip_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('aip', AIP_OPTION_REPO, [
        'type'              => 'string',
        'sanitize_callback' => function ($value) {
            // Expect "owner/repo".
            return preg_match('#^[\w.-]+/[\w.-]+$#', (string) $value) ? $value : '';
        },
    ]);
    register_setting('aip', AIP_OPTION_TOKEN, [
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
    ]);
});

function aip_render_settings_page()
{
    if (!current_user_can('manage_options')) {
        return;
    }

    $test_result = get_transient('aip_test_result');
    if ($test_result) {
        delete_transient('aip_test_result');
    }
    ?>
    <div class="wrap">
        <h1>Instant Publish</h1>
        <p>When a post is published, this plugin asks GitHub to rebuild the static site.
           Readers see the new article about 2–3 minutes later.</p>

        <?php if ($test_result) : ?>
            <div class="notice <?php echo $test_result['ok'] ? 'notice-success' : 'notice-error'; ?>">
                <p><?php echo esc_html($test_result['message']); ?></p>
            </div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php settings_fields('aip'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="aip_repo">GitHub repository</label></th>
                    <td>
                        <input name="<?php echo esc_attr(AIP_OPTION_REPO); ?>" id="aip_repo" type="text"
                               class="regular-text" placeholder="your-org/antiwar-redesign"
                               value="<?php echo esc_attr(get_option(AIP_OPTION_REPO, '')); ?>">
                        <p class="description">The repository that hosts the site, as <code>owner/repo</code>.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="aip_token">GitHub token</label></th>
                    <td>
                        <input name="<?php echo esc_attr(AIP_OPTION_TOKEN); ?>" id="aip_token" type="password"
                               class="regular-text" autocomplete="off"
                               value="<?php echo esc_attr(get_option(AIP_OPTION_TOKEN, '')); ?>">
                        <p class="description">
                            A fine-grained personal access token scoped to <strong>only that repository</strong>
                            with the <strong>Contents: read &amp; write</strong> permission.
                            Create one at GitHub → Settings → Developer settings → Fine-grained tokens.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="aip_test">
            <?php wp_nonce_field('aip_test'); ?>
            <?php submit_button('Send Test Rebuild', 'secondary'); ?>
        </form>
    </div>
    <?php
}

add_action('admin_post_aip_test', function () {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized');
    }
    check_admin_referer('aip_test');

    set_transient('aip_test_result', aip_trigger_rebuild(true), 60);

    wp_safe_redirect(admin_url('options-general.php?page=aip-settings'));
    exit;
});
