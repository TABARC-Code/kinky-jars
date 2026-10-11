<?php
/**
 * Plugin Name:       Kink Jars
 * Plugin URI:        https://github.com/TABARC-Code/kinky-jars
 * Description:       The Kink Jars questionnaire on any page or post with the [kink_jars] shortcode. Answers stay in the visitor's browser; the plugin stores nothing.
 * Version:           __KINK_JARS_VERSION__
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            TABARC-Code
 * Author URI:        https://github.com/TABARC-Code
 * Text Domain:       kink-jars
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Swapped in by scripts/build-plugin.sh from VERSION in index.html, so there's only one number to bump.
define( 'KINK_JARS_VERSION', '__KINK_JARS_VERSION__' );

/*
 * Why an iframe and not a script tag: the app owns a whole page (fixed save bar, two modal
 * dialogues, its own fonts and body styles). Inside an iframe no theme can tread on it and it
 * can't tread on the theme. Same origin as the site, so local storage, downloads and the
 * clipboard behave exactly as on the standalone page.
 */
function kink_jars_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'height' => '90vh',
			'title'  => __( 'Kink Jars questionnaire', 'kink-jars' ),
		),
		$atts,
		'kink_jars'
	);

	// Only a plain number with px or vh gets through. Anything else falls back rather than leaking into CSS.
	$height = preg_match( '/^[0-9]{3,4}px$|^[0-9]{2,3}vh$/', (string) $atts['height'] ) ? $atts['height'] : '90vh';
	$src    = add_query_arg( 'v', KINK_JARS_VERSION, plugins_url( 'app/index.html', __FILE__ ) );

	return sprintf(
		'<div class="kink-jars-embed"><iframe src="%1$s" title="%2$s" style="display:block;width:100%%;height:%3$s;border:0" loading="lazy" allow="clipboard-write; web-share"></iframe><p class="kink-jars-open"><a href="%1$s" target="_blank" rel="noopener">%4$s</a></p></div>',
		esc_url( $src ),
		esc_attr( $atts['title'] ),
		esc_attr( $height ),
		esc_html__( 'Open Kink Jars full screen', 'kink-jars' )
	);
}
add_shortcode( 'kink_jars', 'kink_jars_shortcode' );
