import React, { Component } from "react";

export default class Home extends Component {
	render() {
		return (
			<div className="home">
				<div className="container">
					<div className="row align-items-center my-5">
						<div className="col-lg-6 mx-auto">
							<h1>Popular Transcriptions</h1>
							<div id="transcriptions"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
