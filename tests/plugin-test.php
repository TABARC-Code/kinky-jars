<?php
// Runs the plugin's shortcode against tiny stand-ins for the WordPress functions it calls.
// Usage: php tests/plugin-test.php [path/to/kink-jars.php]
define( 'ABSPATH', __DIR__ );
$GLOBALS['shortcodes'] = array();
function __( $s, $d = null ) { return $s; }
function esc_html__( $s, $d = null ) { return htmlspecialchars( $s, ENT_QUOTES ); }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_url( $s ) { return preg_match( '#^https?://#', $s ) ? htmlspecialchars( $s, ENT_QUOTES ) : ''; }
function plugins_url( $path, $file ) { return 'https://example.test/wp-content/plugins/kink-jars/' . $path; }
function add_query_arg( $k, $v, $url ) { return $url . '?' . $k . '=' . rawurlencode( $v ); }
function add_shortcode( $tag, $fn ) { $GLOBALS['shortcodes'][ $tag ] = $fn; }
function shortcode_atts( $defaults, $atts, $tag ) {
	$out = array();
	foreach ( $defaults as $k => $v ) { $out[ $k ] = is_array( $atts ) && array_key_exists( $k, $atts ) ? $atts[ $k ] : $v; }
	return $out;
}

require $argv[1] ?? __DIR__ . '/../wordpress/kink-jars/kink-jars.php';

$fails = 0;
function check( $name, $ok ) { global $fails; echo ( $ok ? 'ok   ' : 'FAIL ' ) . $name . "\n"; if ( ! $ok ) { $fails++; } }
$render = $GLOBALS['shortcodes']['kink_jars'] ?? null;
check( 'shortcode is registered', is_callable( $render ) );

$html = $render( array() );
check( 'defaults to 90vh', strpos( $html, 'height:90vh' ) !== false );
check( 'points at the bundled app', strpos( $html, 'kink-jars/app/index.html?v=' ) !== false );
check( 'allows clipboard and share', strpos( $html, 'allow="clipboard-write; web-share"' ) !== false );
check( 'has a full-screen link', strpos( $html, 'Open Kink Jars full screen' ) !== false );

check( 'accepts 800px', strpos( $render( array( 'height' => '800px' ) ), 'height:800px' ) !== false );
check( 'accepts 75vh', strpos( $render( array( 'height' => '75vh' ) ), 'height:75vh' ) !== false );
foreach ( array( '100px;background:url(x)', '9999999px', '5px', '80%', 'expression(alert(1))', '' ) as $bad ) {
	$out = $render( array( 'height' => $bad ) );
	check( 'rejects height ' . json_encode( $bad ), strpos( $out, 'height:90vh' ) !== false );
}

$evil = $render( array( 'title' => '"><script>alert(1)</script>' ) );
check( 'escapes the title', strpos( $evil, '<script>' ) === false && strpos( $evil, '&quot;&gt;&lt;script&gt;' ) !== false );

exit( $fails ? 1 : 0 );
