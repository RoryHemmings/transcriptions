import React, { Component } from "react";

export default class Search extends Component {
	render() {
		return (
			<div className="search">
				<div className="container">
					<div className="row align-items-center my-5">
						<div className="col-lg-6 mx-auto">
							<h1>Search</h1>
              <input></input>
							<div id="results"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
